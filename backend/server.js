require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const promClient = require('prom-client');

const app = express();
const PORT = 5000;

// MySQL 연결 설정
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('DB 연결 실패:', err);
    return;
  }
  console.log('DB 연결 성공');
});

db.on('error', (err) => {
  console.error('DB 연결 오류:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    db.connect((err) => {
      if (err) {
        console.error('DB 연결 실패:', err);
        return;
      }
      console.log('DB 연결 성공');
    });
  }
});

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());

// 파일 업로드 설정
const uploadDirectory = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDirectory)) fs.mkdirSync(uploadDirectory);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirectory),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// Prometheus 메트릭 설정
const register = new promClient.Registry();
promClient.collectDefaultMetrics({
  register,
  blacklist: ['nodejs_external_memory_bytes', 'nodejs_active_requests', 'nodejs_active_handles'],
});

// 사용자 정의 메트릭 추가
const cpuUsageGauge = new promClient.Gauge({
  name: 'custom_cpu_usage_percent',
  help: 'CPU usage as a percentage',
});

const eventLoopLagGauge = new promClient.Gauge({
  name: 'custom_event_loop_lag_seconds',
  help: 'Event loop lag in seconds',
});

const externalMemoryGauge = new promClient.Gauge({
  name: 'custom_external_memory_bytes',
  help: 'External memory usage in bytes',
});

const heapSizeGauge = new promClient.Gauge({
  name: 'custom_heap_size_bytes',
  help: 'Heap size in bytes',
  labelNames: ['type'],
});

const processMemoryGauge = new promClient.Gauge({
  name: 'custom_process_memory_bytes',
  help: 'Process memory usage in bytes',
});

const nodeVersionGauge = new promClient.Gauge({
  name: 'custom_nodejs_version_info',
  help: 'Node.js version',
  labelNames: ['version'],
});

nodeVersionGauge.set({ version: process.version }, 1);

// 메트릭 등록
register.registerMetric(cpuUsageGauge);
register.registerMetric(eventLoopLagGauge);
register.registerMetric(externalMemoryGauge);
register.registerMetric(heapSizeGauge);
register.registerMetric(processMemoryGauge);
register.registerMetric(nodeVersionGauge);

// 주기적으로 메트릭 업데이트
setInterval(() => {
  const memoryUsage = process.memoryUsage();

  // CPU 사용률 계산
  const cpuUsage = process.cpuUsage();
  const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1e6) / 100;
  cpuUsageGauge.set(cpuPercent);

  // 이벤트 루프 지연 측정
  const start = process.hrtime();
  setImmediate(() => {
    const delta = process.hrtime(start);
    const lag = delta[0] + delta[1] / 1e9;
    eventLoopLagGauge.set(lag);
  });

  // 메모리 사용량 업데이트
  externalMemoryGauge.set(memoryUsage.external);
  heapSizeGauge.set({ type: 'total' }, memoryUsage.heapTotal);
  heapSizeGauge.set({ type: 'used' }, memoryUsage.heapUsed);
  processMemoryGauge.set(memoryUsage.rss);
}, 5000);

// Prometheus 메트릭 엔드포인트
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// 로그인 API
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
    if (err) {
      console.error('쿼리 오류:', err);
      return res.status(500).json({ message: `서버 오류: ${err.message}` });
    }

    if (results && results.length > 0) {
      return res.status(200).json({ message: '로그인 성공' });
    } else {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 틀렸습니다.' });
    }
  });
});

// 파일 업로드 및 관리 API
app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) return res.json({ message: '파일 업로드 성공!', file: req.file });
  res.status(400).json({ message: '파일 업로드 실패.' });
});

app.get('/files', (req, res) => {
  fs.readdir(uploadDirectory, (err, files) => {
    if (err) return res.status(500).json({ message: '파일 목록 실패' });
    res.json(files);
  });
});

app.delete('/files/:fileName', (req, res) => {
  const filePath = path.join(uploadDirectory, req.params.fileName);
  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ message: '파일 삭제 실패' });
    res.json({ message: '파일 삭제 성공!' });
  });
});

app.get('/download/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(uploadDirectory, fileName);

  res.download(filePath, (err) => {
    if (err) {
      console.error('파일 다운로드 실패:', err);
      res.status(500).send('파일 다운로드 실패');
    }
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});

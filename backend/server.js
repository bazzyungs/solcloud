require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// MySQL 연결 설정
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('DB 연결 실패:', err);
    process.exit(1); // 연결 실패 시 서버 종료
  }
  console.log('DB 연결 성공');
});

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());

// 로컬 디렉토리 설정 (파일 저장 위치)
const uploadDirectory = path.join(__dirname, 'uploads'); // 로컬의 uploads 디렉토리

// 로컬 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

// 파일 업로드 설정 (multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);  // 저장할 디렉토리 지정
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);  // 파일 이름을 원래 이름으로 저장
  }
});

const upload = multer({
  storage: storage, // 업로드할 로컬 디렉토리 지정
  limits: { fileSize: 10000000 }, // 파일 크기 제한 (10MB)
  fileFilter: (req, file, cb) => {
    cb(null, true); // 모든 파일 허용
  }
});

// 로그인 API
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // 데이터베이스에서 사용자 검색
  db.query(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: '서버 오류', status: 'error' });
      }
      if (results.length > 0) {
        return res.status(200).json({ message: '로그인 성공', status: 'success' });
      } else {
        return res.status(401).json({ message: '아이디 또는 비밀번호가 틀렸습니다.', status: 'error' });
      }
    }
  );
});

// 파일 업로드 API
app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    res.json({ message: '파일 업로드 성공!', file: req.file });
  } else {
    res.status(400).json({ message: '파일 업로드 실패.' });
  }
});

// 파일 목록 조회 API
app.get('/files', (req, res) => {
  fs.readdir(uploadDirectory, (err, files) => {
    if (err) {
      return res.status(500).json({ message: '파일 목록을 가져오는 데 실패했습니다.' });
    }
    res.json(files);
  });
});

// 파일 삭제 API
app.delete('/files/:fileName', (req, res) => {
  const filePath = path.join(uploadDirectory, req.params.fileName);

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ message: '파일 삭제 실패.' });
    }
    res.json({ message: '파일 삭제 성공!' });
  });
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});


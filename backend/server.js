require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

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

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});


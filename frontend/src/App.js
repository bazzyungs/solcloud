import React, { useState } from 'react';
import './App.css';
import Login from './Login';
import Storage from './Storage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 상태를 관리

  return (
    <div className="App">
      {isLoggedIn ? (
        <Storage /> // 로그인 상태에 따라 스토리지 UI 표시
      ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} /> // 로그인 컴포넌트에 상태 변경 함수 전달
      )}
    </div>
  );
}

export default App;


import { AuthView } from './components/views/AuthView';
import { useEffect, useState } from 'react';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:8080';
axios.defaults.withCredentials = true; 

function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    
    axios.get('/api/v1/user')
      .then(response => {
        if (typeof response.data === 'string' && response.data.includes("<!DOCTYPE html>")) {
             console.log("세션 만료됨. 재로그인 필요.");
             setUser(null); // 로그인 안 된 상태로 처리
             return;
        }
        console.log("로그인 성공 데이터:", response.data);
        setUser(response.data);
      })
      .catch(error => {
        console.log("로그인 실패 또는 미인증:", error);
      });
  }, []);

  const handleRegister = async (username: string, displayName: string) => {
    console.log('회원가입 요청:', username, displayName);
    return true; 
  };

  const handleLogin = (provider: string) => {
    // 백엔드 로그인 URL로 이동
    window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
  };

  const handleRecovery = async (username: string, code: string) => {
    console.log('복구 요청:', username, code);
  };

  if (user) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold">환영합니다, {user.name}님!</h1>
        <p>{user.email}</p>
        {user.picture && (
             <img src={user.picture} alt="profile" className="w-20 h-20 rounded-full mx-auto mt-4"/>
        )}
      </div>
    );
  }
  
  return (
    <AuthView 
      onRegister={handleRegister}
      onLogin={handleLogin}
      onRecovery={handleRecovery}
    />
  );
}

export default App;
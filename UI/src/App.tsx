import { AuthView } from './components/views/AuthView';
import { useEffect, useState } from 'react';
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8080';

function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/v1/user')
      .then(response => {
        console.log("로그인 성공:", response.data);
        setUser(response.data);
      })
      .catch(() => {
        console.log("로그인 상태 아님");
      });
  }, []);

  const handleRegister = async (username: string, displayName: string) => {
    console.log('회원가입 요청:', username, displayName);
    // await axios.post('/api/register', { ... })
    return true; 
  };

  const handleLogin = (provider: string) => {
    
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
        <img src={user.picture} alt="profile" className="w-20 h-20 rounded-full mx-auto mt-4"/>
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
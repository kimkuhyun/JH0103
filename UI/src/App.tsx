import { AuthView } from './components/views/AuthView';

function App() {
  // [나중에 구현]
  // 지금은 콘솔에 로그만 

  const handleRegister = async (username: string, displayName: string) => {
    console.log('회원가입 요청:', username, displayName);
    // await axios.post('/api/register', { ... })
    return true; 
  };

  const handleLogin = async (username?: string) => {
    console.log('로그인 요청:', username);
    
    // window.location.href = "http://localhost:8080/oauth2/authorization/google";
  };

  const handleRecovery = async (username: string, code: string) => {
    console.log('복구 요청:', username, code);
  };

  return (
    <AuthView 
      onRegister={handleRegister}
      onLogin={handleLogin}
      onRecovery={handleRecovery}
    />
  );
}

export default App;
import { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthView } from './components/views/AuthView'; // 기존 파일 유지
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';

// 카카오 API 키 (환경변수나 상수로 관리 권장)
const KAKAO_API_KEY = "YOUR_KAKAO_JAVASCRIPT_KEY"; 

axios.defaults.baseURL = 'http://localhost:8080';
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('board');

  // 카카오맵 스크립트 로드 (앱 시작 시 한 번만)
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services,clusterer&autoload=false`;
    script.async = true;
    document.head.appendChild(script);
    
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    axios.get('/api/v1/user')
      .then(response => {
        if (typeof response.data === 'string' && response.data.includes("<!DOCTYPE html>")) {
             setUser(null);
        } else {
             setUser(response.data);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  const handleLogin = (provider: string) => {
    window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/v1/auth/logout');
      setUser(null);
    } catch (error) { console.error(error); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">로딩 중...</div>;
  
  // 로그인 안 된 경우
  if (!user) {
    return <AuthView onRegister={() => Promise.resolve(true)} onLogin={handleLogin} onRecovery={() => {}} />;
  }

  // 로그인 된 경우 (메인 레이아웃)
  return (
    <div className="flex h-screen bg-[#F5F7F8] font-sans text-slate-600 overflow-hidden">
      <Sidebar 
        activeMenu={activeMenu} 
        onMenuClick={setActiveMenu} 
        userName={user.name || "사용자"} 
        onLogout={handleLogout}
      />
      
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {activeMenu === 'board' && <Dashboard />}
        {activeMenu === 'calendar' && <div className="p-10 text-xl font-bold">캘린더 페이지 (준비중)</div>}
        {activeMenu === 'map' && <div className="p-10 text-xl font-bold">전체 지도 페이지 (준비중)</div>}
      </main>
    </div>
  );
}

export default App;
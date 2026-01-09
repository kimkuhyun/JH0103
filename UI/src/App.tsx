import { useState, useEffect } from 'react';
import axios from 'axios';
<<<<<<< HEAD
import { AuthView } from './components/views/AuthView';
import { Sidebar } from './components/layout/Sidebar'; // default export 확인
import { Dashboard } from './pages/Dashboard';
import { KakaoMapContainer } from './components/map/KakaoMapContainer';
import { MOCK_JOBS } from './mockdata/mockData';
import type{ JobStatus } from './types';

const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY;
=======
import { AuthView } from './components/views/AuthView'; // 기존 파일 유지
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';

// 카카오 API 키 (환경변수나 상수로 관리 권장)
const KAKAO_API_KEY = "YOUR_KAKAO_JAVASCRIPT_KEY"; 
>>>>>>> ce7f17e29a8efcd32426588b959bd564a16b9a7c

axios.defaults.baseURL = 'http://localhost:8080';
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('board');
<<<<<<< HEAD
  const [currentFilter, setCurrentFilter] = useState<JobStatus | 'ALL'>('ALL');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
=======
>>>>>>> ce7f17e29a8efcd32426588b959bd564a16b9a7c

  // 카카오맵 스크립트 로드 (앱 시작 시 한 번만)
  useEffect(() => {
<<<<<<< HEAD
    // 1. 카카오맵 스크립트 주입
    if (!document.getElementById('kakao-map-script')) {
      const script = document.createElement("script");
      script.id = 'kakao-map-script';
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services,clusterer&autoload=false`;
      script.async = true;
      document.head.appendChild(script);
    }
    
    // 2. 로그인 상태 확인
=======
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services,clusterer&autoload=false`;
    script.async = true;
    document.head.appendChild(script);
    
>>>>>>> ce7f17e29a8efcd32426588b959bd564a16b9a7c
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    axios.get('/api/v1/user')
      .then(response => {
<<<<<<< HEAD
        // 스프링 시큐리티가 로그인 페이지(HTML)를 반환하는 경우 체크
=======
>>>>>>> ce7f17e29a8efcd32426588b959bd564a16b9a7c
        if (typeof response.data === 'string' && response.data.includes("<!DOCTYPE html>")) {
          setUser(null);
        } else {
<<<<<<< HEAD
          setUser(response.data);
=======
             setUser(response.data);
>>>>>>> ce7f17e29a8efcd32426588b959bd564a16b9a7c
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

<<<<<<< HEAD
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <div className="text-8xl font-black text-teal-600 animate-bounce">C</div>
        <div className="mt-4 text-lg font-semibold">로그인 상태를 확인하는 중입니다...</div>
      </div>
    );
=======
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50">로딩 중...</div>;
  
  // 로그인 안 된 경우
  if (!user) {
    return <AuthView onRegister={() => Promise.resolve(true)} onLogin={handleLogin} onRecovery={() => {}} />;
>>>>>>> ce7f17e29a8efcd32426588b959bd564a16b9a7c
  }
  
  if (!user) {
    return <AuthView onRegister={() => Promise.resolve(true)} onLogin={handleLogin} onRecovery={() => {}} />;
  }

<<<<<<< HEAD
  return (
    <div className="flex h-screen bg-[#F5F7F8] font-sans text-slate-600 overflow-hidden">
      <Sidebar 
        currentFilter={currentFilter} 
        onFilterChange={setCurrentFilter} 
        userName={user.name || "사용자"} 
        onLogout={handleLogout}
        activeMenu={activeMenu}
        onMenuClick={setActiveMenu}
      />
      
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {activeMenu === 'board' && (
          <Dashboard />
        )}
        
        {activeMenu === 'calendar' && <div className="p-10 text-xl font-bold">캘린더 페이지 (준비중)</div>}
        {activeMenu === 'map' && (
           <div className="w-full h-full">
             <KakaoMapContainer
                jobs={MOCK_JOBS}
                selectedJobId={selectedJobId}
                onSelectJob={setSelectedJobId}
                fullScreen
              />
           </div>
        )}
=======
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
>>>>>>> ce7f17e29a8efcd32426588b959bd564a16b9a7c
      </main>
    </div>
  );
}

export default App;
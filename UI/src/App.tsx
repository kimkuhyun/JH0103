import { AuthView } from './components/views/AuthView';
import { useEffect, useState } from 'react';
import axios from 'axios';

// 아이콘 사용을 위해 lucide-react 설치 권장 (없으면 텍스트로 대체 가능)
// npm install lucide-react 

axios.defaults.baseURL = 'http://localhost:8080';
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true); // 로딩 상태 추가

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    axios.get('/api/v1/user')
      .then(response => {
        // HTML이 반환되면(로그인 페이지) 세션 만료로 간주
        if (typeof response.data === 'string' && response.data.includes("<!DOCTYPE html>")) {
             setUser(null);
        } else {
             console.log("로그인 성공:", response.data);
             setUser(response.data);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  // --- 핸들러 ---
  const handleLogin = (provider: string) => {
    window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/v1/auth/logout');
      setUser(null); // 상태 초기화 -> 로그인 화면으로 전환
    } catch (error) {
      console.error("로그아웃 실패", error);
    }
  };

  const handleRegister = async (username: string, displayName: string) => {
    console.log('가입 요청:', username, displayName);
    return true;
  };

  const handleRecovery = (username: string, code: string) => {
    console.log('복구:', username, code);
  };

  // --- 렌더링 ---

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">로딩 중...</div>;
  }

  // 1. 비로그인 상태 -> AuthView (기존 유지)
  if (!user) {
    return (
      <AuthView 
        onRegister={handleRegister}
        onLogin={handleLogin}
        onRecovery={handleRecovery}
      />
    );
  }

  // 2. 로그인 상태 -> 메인 대시보드 UI (새로 작성)
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* [헤더] */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0052CC] rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">CareerOS</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
             {user.picture ? (
               <img src={user.picture} alt="profile" className="w-8 h-8 rounded-full border border-slate-200" />
             ) : (
               <div className="w-8 h-8 rounded-full bg-slate-200" />
             )}
             <div className="text-sm">
               <div className="font-semibold text-slate-700">{user.name}</div>
               <div className="text-xs text-slate-500">{user.email}</div>
             </div>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full p-6 gap-6">
        {/* [사이드바] - 나중에 메뉴 확장 가능 */}
        <aside className="w-64 hidden md:block">
          <nav className="space-y-1">
            <NavItem label="내 채용 보드" active />
            <NavItem label="캘린더" />
            <NavItem label="분석 리포트" />
            <NavItem label="설정" />
          </nav>
        </aside>

        {/* [메인 컨텐츠] - 여기가 나중에 공고 카드 채워질 곳 */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">내 채용 보드</h2>
            <button className="bg-[#0052CC] hover:bg-[#0747A6] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
              + 공고 직접 추가
            </button>
          </div>

          {/* 빈 상태 (Empty State) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              📂
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">아직 저장된 공고가 없어요</h3>
            <p className="text-slate-500 text-sm mb-6">
              크롬 익스텐션을 설치하고<br/>원하는 공고를 클릭 한 번으로 저장해보세요.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 font-mono">
              👉 익스텐션 설치하러 가기 (준비중)
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// 간단한 네비게이션 아이템 컴포넌트
function NavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? 'bg-[#0052CC]/10 text-[#0052CC]' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}>
      {label}
    </button>
  );
}

export default App;
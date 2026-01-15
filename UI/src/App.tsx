import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthView } from './components/views/AuthView';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AuthCallback } from './pages/AuthCallback';

axios.defaults.baseURL = 'http://localhost:8080';
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('board');

  useEffect(() => {
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
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-lg text-slate-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthView 
              onRegister={() => Promise.resolve(true)} 
              onLogin={handleLogin} 
              onRecovery={() => {}} 
            />
          )
        }
      />

      <Route
        path="/*"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <div className="flex h-screen bg-[#F5F7F8] font-sans text-slate-600 overflow-hidden">
              <Sidebar 
                activeMenu={activeMenu} 
                onMenuClick={setActiveMenu} 
                userName={user.name || "사용자"} 
                onLogout={handleLogout}
              />
              
              <main className="flex-1 flex flex-col min-w-0 h-full">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/calendar" element={<div className="p-10 text-xl font-bold">캘린더 페이지 (준비중)</div>} />
                  <Route path="/map" element={<div className="p-10 text-xl font-bold">전체 지도 페이지 (준비중)</div>} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
          )
        }
      />
    </Routes>
  );
}

export default App;

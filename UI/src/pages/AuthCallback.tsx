import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // URL에서 토큰이나 에러 파라미터 확인
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login');
      return;
    }

    // 인증 성공 후 대시보드로 이동
    // 짧은 딜레이를 줘서 애니메이션 보이도록
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center">
      <div className="text-center">
        {/* 로고 애니메이션 */}
        <div className="relative inline-block mb-8">
          {/* 그림자 효과 */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-3 bg-teal-200 rounded-full blur-md opacity-50 animate-shadow-pulse" />
          
          {/* 로고 C - 바운스 애니메이션 */}
          <div className="relative w-24 h-24 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center animate-bounce-smooth">
            <span className="text-5xl font-black text-white">C</span>
          </div>
        </div>

        {/* 로딩 텍스트 */}
        <h2 className="text-2xl font-bold text-slate-800 mb-2">로그인 중입니다</h2>
        <p className="text-slate-500 text-sm">잠시만 기다려주세요...</p>

        {/* 로딩 인디케이터 */}
        <div className="flex gap-2 justify-center mt-6">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

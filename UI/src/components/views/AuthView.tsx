import React, { useEffect, useMemo, useState, FormEvent } from 'react';

interface AuthViewProps {
  onRegister: (username: string, displayName: string) => Promise<boolean> | boolean;
  onLogin: (username?: string) => Promise<void> | void;
  onRecovery: (username: string, code: string) => Promise<void> | void;
  notice?: string | null;
  error?: string | null;
}


const INPUT_BASE_CLASS = "w-full bg-white border rounded-lg px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400";
const INPUT_DEFAULT_CLASS = `${INPUT_BASE_CLASS} border-slate-300 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#202124]`;
const INPUT_ERROR_CLASS = `${INPUT_BASE_CLASS} border-red-500 focus:border-red-600 text-red-900`;

export const AuthView: React.FC<AuthViewProps> = ({
  onRegister,
  onLogin,
  onRecovery,
  notice,
  error,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerUsername, setRegisterUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (mode === 'login') {
      setRegisterUsername('');
      setDisplayName('');
    } else {
      setLoginUsername('');
      setRecoveryUsername('');
      setRecoveryCode('');
      setShowRecovery(false);
    }
  }, [mode]);

  const usernameIssue = useMemo(() => {
    const value = registerUsername.trim();
    if (!value) return null;
    if (value.length < 3 || value.length > 64) return '3~64자만 사용할 수 있습니다.';
    if (/\s/.test(value)) return '공백은 사용할 수 없습니다.';
    if (!/^[A-Za-z0-9@._-]+$/.test(value)) return '영문, 숫자, @ . _ -만 사용할 수 있습니다.';
    if (value.includes('@') && !/^[^@]+@[^@]+\.[^@]+$/.test(value)) return '이메일 형식이 올바르지 않습니다.';
    return null;
  }, [registerUsername]);

  const displayNameIssue = useMemo(() => {
    const value = displayName.trim();
    if (!value) return null;
    if (value.length < 2 || value.length > 30) return '표시 이름은 2~30자만 사용할 수 있습니다.';
    return null;
  }, [displayName]);

  const canRegister = registerUsername.trim().length > 0 && !usernameIssue && !displayNameIssue;

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    onLogin(loginUsername.trim() || undefined);
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isRegistering || !canRegister) return;
    setIsRegistering(true);
    try {
      const succeeded = await onRegister(registerUsername.trim(), displayName.trim());
      if (succeeded) setMode('login');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRecoverySubmit = (e: FormEvent) => {
    e.preventDefault();
    onRecovery(recoveryUsername.trim(), recoveryCode.trim());
  };

  return (
    // 배경색 #F8FAFC (연한 그레이)로 카드와 구분감 제공
    <div className="min-h-screen bg-[#F8FAFC] text-[#202124] flex items-center justify-center p-6 font-sans">
      {/* 메인 카드: #FFFFFF 배경 */}
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-8 md:p-10 space-y-8 shadow-sm">
        
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0052CC]" />
              <h1 className="text-2xl font-bold tracking-tight text-[#202124]">
                {mode === 'login' ? '로그인' : '새 계정 등록'}
              </h1>
            </div>
            {mode === 'register' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-slate-500 hover:text-[#0052CC] transition-colors"
              >
                로그인으로 돌아가기
              </button>
            )}
          </div>
          
        </header>

        {mode === 'login' ? (
          <>
            <form onSubmit={handleLoginSubmit} className="space-y-5">

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#003D99] transition-colors text-white px-4 py-3 rounded-lg text-sm font-bold shadow-sm"
                >
                  패스키로 로그인
                </button>
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-xs text-slate-400">또는</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 transition-colors text-[#202124] px-4 py-3 rounded-lg text-sm font-semibold"
                >
                  새 계정 만들기
                </button>
              </div>
            </form>

            <div className="border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => setShowRecovery((prev) => !prev)}
                className="w-full flex items-center justify-between text-sm font-medium text-slate-500 hover:text-[#202124]"
              >
                
                <span className="text-xs font-normal underline">{showRecovery ? '닫기' : '복구 코드로 로그인'}</span>
              </button>
              
              {showRecovery && (
                <form onSubmit={handleRecoverySubmit} className="mt-4 space-y-4 bg-slate-50 rounded-xl p-5 border border-slate-100 animate-in fade-in duration-200">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">이메일</label>
                      <input
                        type="email"
                        value={recoveryUsername}
                        onChange={(e) => setRecoveryUsername(e.target.value)}
                        className={INPUT_DEFAULT_CLASS}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">복구 코드</label>
                      <input
                        type="text"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        className={`${INPUT_DEFAULT_CLASS} tracking-widest font-mono`}
                        placeholder="XXXXX-XXXXX"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    복구 로그인
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="register-username" className="text-sm font-semibold text-[#202124]">아이디 (이메일)</label>
                <input
                  id="register-username"
                  type="email"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  className={usernameIssue ? INPUT_ERROR_CLASS : INPUT_DEFAULT_CLASS}
                  placeholder="user@example.com"
                />
                {usernameIssue && <p className="text-xs text-red-600 mt-1">! {usernameIssue}</p>}
              </div>
              
              <div className="space-y-1">
                <label htmlFor="display-name" className="text-sm font-semibold text-[#202124]">표시 이름</label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={displayNameIssue ? INPUT_ERROR_CLASS : INPUT_DEFAULT_CLASS}
                  placeholder="프로필 이름"
                />
                {displayNameIssue && <p className="text-xs text-red-600 mt-1">! {displayNameIssue}</p>}
              </div>
            </div>

            <div className="bg-[#0052CC]/5 border border-[#0052CC]/10 rounded-xl p-4 text-sm">
              <div className="font-semibold text-[#0052CC] mb-1">등록 안내</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
                <li>정보 입력 후 등록 시작을 누르세요.</li>
                <li>생체 인식(지문/Face ID)을 사용합니다.</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isRegistering || !canRegister}
                className="flex-1 bg-[#0052CC] hover:bg-[#0747A6] disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2.5 rounded-lg text-sm font-bold"
              >
                {isRegistering ? '처리 중...' : '등록 시작'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
            </div>
          </form>
        )}

        {notice && (
          <div className="text-sm text-[#0052CC] bg-[#0052CC]/5 border border-[#0052CC]/20 rounded-lg px-4 py-3 flex items-start gap-2">
            <span>ℹ️</span>
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useEffect, useMemo, useState, FormEvent } from 'react';

interface AuthViewProps {
  onRegister: (username: string, displayName: string) => Promise<boolean> | boolean;
  onLogin: (username?: string) => Promise<void> | void;
  onRecovery: (username: string, code: string) => Promise<void> | void;
  notice?: string | null;
  error?: string | null;
}


const INPUT_BASE_CLASS = "w-full bg-slate-50 border rounded-lg px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-600";
const INPUT_DEFAULT_CLASS = `${INPUT_BASE_CLASS} border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500`;
const INPUT_ERROR_CLASS = `${INPUT_BASE_CLASS} border-red-900 focus:border-red-700`;

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

  // 모드 변경 시 초기화 로직
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
    if (/^[._-]|[._-]$/.test(value)) return '특수문자로 시작하거나 끝날 수 없습니다.';
    if (/[@._-]{2,}/.test(value)) return '특수문자를 연속으로 사용할 수 없습니다.';
    if (value.includes('@') && !/^[^@]+@[^@]+\.[^@]+$/.test(value)) return '이메일 형식이 올바르지 않습니다.';
    return null;
  }, [registerUsername]);

  const displayNameIssue = useMemo(() => {
    const value = displayName.trim();
    if (!value) return null;
    if (value.length < 2 || value.length > 30) return '표시 이름은 2~30자만 사용할 수 있습니다.';
    if (/\s{2,}/.test(value)) return '연속 공백은 사용할 수 없습니다.';
    if (!/^[A-Za-z0-9가-힣 ._-]+$/.test(value)) return '표시 이름에는 특수문자를 사용할 수 없습니다.';
    if (/^[._-]|[._-]$/.test(value)) return '특수문자로 시작하거나 끝날 수 없습니다.';
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
      if (succeeded) {
        setMode('login');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRecoverySubmit = (e: FormEvent) => {
    e.preventDefault();
    onRecovery(recoveryUsername.trim(), recoveryCode.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-8 md:p-10 space-y-8 shadow-xl]">
        
        {/* 헤더 섹션 */}
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <h1 className="text-3xl font-bold tracking-tight text-slate-100">
                {mode === 'login' ? 'JH0103 로그인' : '새 계정 등록'}
              </h1>
            </div>
            {mode === 'register' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
              >
                로그인으로 돌아가기
              </button>
            )}
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            {mode === 'login'
              ? '보안과 편의성을 갖춘 패스키 인증 시스템입니다.'
              : '간편한 등록으로 안전한 로그인을 경험해보세요.'}
          </p>
        </header>

        {/* 로그인 모드 */}
        {mode === 'login' ? (
          <>
            <form onSubmit={handleLoginSubmit} className="bg-slate-50/60 border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">간편 로그인</h2>
                <span className="text-xs text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-0.5">
                  Passkey
                </span>
              </div>
              
              <div className="space-y-3">
                
                <label htmlFor="login-username" className="text-sm font-medium text-slate-300">사용자명 (선택)</label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username webauthn"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className={INPUT_DEFAULT_CLASS}
                  placeholder="기기에 저장된 키가 있다면 비워두세요"
                />
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors text-slate-900 px-4 py-3 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20"
                >
                  패스키로 로그인
                </button>
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-xs text-slate-500">또는</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-slate-200 px-4 py-3 rounded-lg text-sm font-semibold"
                >
                  새 패스키 생성하기
                </button>
              </div>
            </form>

            {/* 복구 코드 섹션 */}
            <div className="border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={() => setShowRecovery((prev) => !prev)}
                className="w-full flex items-center justify-between text-left text-sm font-medium text-slate-500 hover:text-slate-200 transition-colors"
              >
                <span>계정 복구</span>
                <span className="text-xs">{showRecovery ? '닫기' : '코드로 로그인'}</span>
              </button>
              
              {showRecovery && (
                <form onSubmit={handleRecoverySubmit} className="mt-4 space-y-4 bg-slate-50/40 border border-slate-200 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="recovery-email" className="text-xs text-slate-500 mb-1 block">이메일</label>
                      <input
                        id="recovery-email"
                        type="email"
                        autoComplete="email"
                        value={recoveryUsername}
                        onChange={(e) => setRecoveryUsername(e.target.value)}
                        className={`${INPUT_DEFAULT_CLASS} py-2`} // 높이 조정 필요시 오버라이딩
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="recovery-code" className="text-xs text-slate-500 mb-1 block">복구 코드</label>
                      <input
                        id="recovery-code"
                        type="text"
                        autoComplete="off"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        className={`${INPUT_DEFAULT_CLASS} py-2 tracking-widest font-mono`}
                        placeholder="XXXXX-XXXXX"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-700 hover:bg-slate-600 transition-colors text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    복구 로그인
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          /* 회원가입 모드 */
          <form onSubmit={handleRegisterSubmit} className="bg-slate-50/60 border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">정보 입력</h2>
              <span className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                Sign Up
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="register-username" className="text-sm font-medium text-slate-300">아이디 (이메일)</label>
                <input
                  id="register-username"
                  type="email"
                  autoComplete="username"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  className={usernameIssue ? INPUT_ERROR_CLASS : INPUT_DEFAULT_CLASS}
                  placeholder="user@example.com"
                />
                {usernameIssue && (
                  <p className="text-xs text-red-400 flex items-center gap-1" role="alert">
                    • {usernameIssue}
                  </p>
                )}
              </div>
              
              <div className="space-y-1">
                <label htmlFor="display-name" className="text-sm font-medium text-slate-300">표시 이름</label>
                <input
                  id="display-name"
                  type="text"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={displayNameIssue ? INPUT_ERROR_CLASS : INPUT_DEFAULT_CLASS}
                  placeholder="프로필에 표시될 이름"
                />
                {displayNameIssue && (
                  <p className="text-xs text-red-400 flex items-center gap-1" role="alert">
                    • {displayNameIssue}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 text-sm space-y-2">
              <div className="font-semibold text-blue-200">등록 안내</div>
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-xs">
                <li>정보 입력 후 <span className="text-slate-300">'등록 시작'</span>을 누르세요.</li>
                <li>브라우저 인증창에서 지문이나 Face ID를 사용합니다.</li>
                <li>등록이 완료되면 바로 로그인됩니다.</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isRegistering || !canRegister}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 transition-colors text-slate-900 px-4 py-2.5 rounded-lg text-sm font-bold"
              >
                {isRegistering ? '처리 중...' : '등록 시작'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                취소
              </button>
            </div>
          </form>
        )}

        {/* Notice & Error */}
        {/* role="alert" 추가하여 스크린 리더가 즉시 읽도록 함 */}
        {notice && (
          <div role="status" className="text-sm text-blue-200 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <span className="mt-0.5">{notice}</span>
          </div>
        )}

        {error && (
          <div role="alert" className="text-sm text-red-200 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span className="mt-0.5">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
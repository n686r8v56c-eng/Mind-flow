import React, { useEffect, useState } from 'react';
import { yogaSupabase } from './supabaseYoga.js';
import './auth.css';

function describeAuthError(error) {
  const msg = String(error?.message || '요청을 처리하지 못했어요.');
  if (/invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호를 확인해 주세요.';
  if (/email not confirmed/i.test(msg)) return '메일함에서 이메일 인증을 완료해 주세요.';
  if (/rate limit/i.test(msg)) return '이메일 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
  if (/already registered/i.test(msg)) return '이미 가입한 이메일이에요. 로그인해 주세요.';
  return msg;
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    if (!yogaSupabase) { setChecking(false); return; }
    let alive = true;
    yogaSupabase.auth.getSession().then(({ data, error: err }) => {
      if (!alive) return;
      if (err) setError(describeAuthError(err));
      setSession(data?.session ?? null);
      setChecking(false);
    }).catch(err => {
      if (alive) { setError(describeAuthError(err)); setChecking(false); }
    });
    const { data: { subscription } } = yogaSupabase.auth.onAuthStateChange((_event, nextSession) => {
      if (alive) { setSession(nextSession); setChecking(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const switchMode = value => { setMode(value); setMessage(''); setError(''); setPassword(''); setConfirmPassword(''); };
  async function submit(event) {
    event.preventDefault();
    if (!yogaSupabase || busy) return;
    setError(''); setMessage('');
    if (mode === 'signup' && password !== confirmPassword) { setError('비밀번호가 일치하지 않아요.'); return; }
    if (mode !== 'reset' && password.length < 6) { setError('비밀번호는 최소 6자리로 입력해 주세요.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await yogaSupabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else if (mode === 'signup') {
        const { data, error: err } = await yogaSupabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (err) throw err;
        if (!data.session) setMessage('가입 요청을 보냈어! 이메일 인증이 켜져 있다면 메일함에서 확인한 후 로그인해 줘.');
      } else {
        const { error: err } = await yogaSupabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (err) throw err;
        setMessage('비밀번호 재설정 메일을 요청했어. 이메일을 확인해 줘.');
      }
    } catch (err) { setError(describeAuthError(err)); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (!yogaSupabase || busy) return;
    setBusy(true); setError('');
    const { error: err } = await yogaSupabase.auth.signOut();
    if (err) setError(describeAuthError(err));
    setShowLogout(false); setBusy(false);
  }

  if (!yogaSupabase) return <div className="mind-auth"><div className="mind-auth-card"><div className="mind-auth-logo">✿</div><h1>Mind Flow</h1><p>Supabase 연결이 필요해요.</p><p className="mind-auth-hint">프로젝트 최상위 .env 파일에 VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY를 설정한 뒤 개발 서버를 다시 시작해 주세요.</p></div></div>;
  if (checking) return <div className="mind-auth"><div className="mind-auth-card"><div className="mind-auth-logo">✿</div><p>로그인 상태 확인 중…</p></div></div>;

  if (session) return <><div className="mind-auth-account"><button type="button" onClick={() => setShowLogout(v => !v)} aria-label="계정 설정">⚙️</button>{showLogout && <div className="mind-auth-account-menu"><small>{session.user?.email}</small><button type="button" onClick={logout} disabled={busy}>로그아웃</button></div>}</div>{children}</>;

  return <div className="mind-auth"><div className="mind-auth-card"><div className="mind-auth-logo">✿</div><div className="mind-auth-overline">YOUR QUIET MOMENT</div><h1>Mind Flow</h1><p className="mind-auth-intro">나만의 고요한 시간을 기록해요.</p><div className="mind-auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>로그인</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>회원가입</button></div>{mode === 'reset' && <h2>비밀번호 재설정</h2>}<form onSubmit={submit}><label>이메일<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label>{mode !== 'reset' && <label>비밀번호<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="6자리 이상" /></label>}{mode === 'signup' && <label>비밀번호 확인<input type="password" autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="비밀번호 다시 입력" /></label>}{error && <p className="mind-auth-error" role="alert">{error}</p>}{message && <p className="mind-auth-success" role="status">{message}</p>}<button className="mind-auth-submit" disabled={busy} type="submit">{busy ? '처리 중…' : mode === 'login' ? '로그인' : mode === 'signup' ? '회원가입' : '재설정 메일 보내기'}</button></form><button className="mind-auth-link" type="button" onClick={() => switchMode(mode === 'reset' ? 'login' : 'reset')}>{mode === 'reset' ? '로그인으로 돌아가기' : '비밀번호를 잊으셨나요?'}</button><div className="mind-auth-footer">BREATHE · MOVE · REST</div></div></div>;
}

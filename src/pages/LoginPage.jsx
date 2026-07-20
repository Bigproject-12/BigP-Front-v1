import { useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import './LoginPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


function FeatureRow({ icon, title, desc }) {
  return (
    <div className="login-intro__feature">
      <span className="login-intro__feature-icon">
        <Icon name={icon} size={16} />
      </span>
      <div className="login-intro__feature-text">
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
    </div>
  );
}

function LoginForm({ onSwitchTab }) {
  const { login } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError('올바른 이메일 형식(@)을 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('?page=dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="login-card__form" onSubmit={handleSubmit}>
      <Input
        label="이메일"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
      />
      <Input
        label="비밀번호"
        type={showPassword ? 'text' : 'password'}
        placeholder="8자 이상 입력해주세요"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        rightSlot={
          <button
            type="button"
            className="ui-field__icon-right"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
          >
            <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
          </button>
        }
      />
      {error && <div className="ui-banner ui-banner--error">{error}</div>}
      <Button type="submit" variant="primary" block disabled={submitting}>
        {submitting ? '로그인 중…' : '로그인'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        block
        disabled={submitting}
        onClick={async () => {
          setError('');
          setSubmitting(true);
          try {
            await login('dev@GuardrAil.io', 'Dev12345!');
            navigate('?page=dashboard', { replace: true });
          } catch (err) {
            setError(err.message);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        Dev 로그인
      </Button>
      <div className="login-card__footer">
        <button type="button" className="ui-btn ui-btn--ghost" onClick={() => onSwitchTab('signup')}>
          회원가입
        </button>
        <button type="button" className="ui-btn ui-btn--ghost" onClick={() => onSwitchTab('find-password')}>
          비밀번호 찾기
        </button>
      </div>
      <div className="ui-card" style={{ marginTop: 4 }}>
        <span className="text-caption-md">
          테스트 계정: dev@GuardrAil.io / dev12345 (일반) · admin@GuardrAil.io / 12345678 (관리자)
        </span>
      </div>
    </form>
  );
}

function SignupForm({ onSwitchTab }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', companyName: '', gitId: '', loginId: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('이름을 입력해주세요.');
    if (!EMAIL_RE.test(form.loginId)) return setError('올바른 이메일 형식(@)을 입력해주세요.');
    if (form.password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.');
    if (form.password !== form.confirm) return setError('비밀번호가 일치하지 않습니다.');

    setSubmitting(true);
    try {
      await signup(form);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="login-card__form">
        <div className="ui-banner ui-banner--success">회원가입이 완료되었습니다. 로그인해주세요.</div>
        <Button variant="primary" block onClick={() => onSwitchTab('login')}>
          로그인하러 가기
        </Button>
      </div>
    );
  }

  return (
    <form className="login-card__form" onSubmit={handleSubmit}>
      <button type="button" className="ui-btn ui-btn--icon" onClick={() => onSwitchTab('login')} aria-label="로그인으로 돌아가기">
        <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <Input label="이름" value={form.name} onChange={set('name')} placeholder="홍길동" />
      <Input label="기업명" value={form.companyName} onChange={set('companyName')} placeholder="AIVLE" />
      <Input label="Git ID" value={form.gitId} onChange={set('gitId')} placeholder="github-username" />
      <Input label="이메일" type="email" value={form.loginId} onChange={set('loginId')} placeholder="you@company.com" />
      <Input label="비밀번호" type="password" value={form.password} onChange={set('password')} placeholder="8자 이상" />
      <Input label="비밀번호 확인" type="password" value={form.confirm} onChange={set('confirm')} />
      {error && <div className="ui-banner ui-banner--error">{error}</div>}
      <Button type="submit" variant="primary" block disabled={submitting}>
        {submitting ? '가입 처리 중…' : '회원가입'}
      </Button>
    </form>
  );
}

function FindPasswordForm({ onSwitchTab }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('올바른 이메일 형식(@)을 입력해주세요.');
      return;
    }
    setError('');
    setSent(true);
  };

  return (
    <form className="login-card__form" onSubmit={handleSubmit}>
      <button type="button" className="ui-btn ui-btn--icon" onClick={() => onSwitchTab('login')} aria-label="로그인으로 돌아가기">
        <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <p className="text-body-sm">가입한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>
      <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      {error && <div className="ui-banner ui-banner--error">{error}</div>}
      {sent && <div className="ui-banner ui-banner--success">재설정 링크를 이메일로 전송했습니다.</div>}
      <Button type="submit" variant="primary" block>
        재설정 링크 전송
      </Button>
    </form>
  );
}

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.');
    if (password !== confirm) return setError('비밀번호가 일치하지 않습니다.');
    setError('');
    setDone(true);
  };

  return (
    <form className="login-card__form" onSubmit={handleSubmit}>
      <p className="text-body-sm">새로운 비밀번호를 설정해주세요.</p>
      <Input label="새 비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" />
      <Input label="새 비밀번호 확인" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <div className="ui-banner ui-banner--error">{error}</div>}
      {done && <div className="ui-banner ui-banner--success">비밀번호가 재설정되었습니다.</div>}
      <Button type="submit" variant="primary" block>
        비밀번호 재설정
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const { params, navigate } = useRouter();
  const tab = params.get('tab');
  const activeTab = ['login', 'signup', 'find-password'].includes(tab) ? tab : 'login';

  const switchTab = (key) => navigate(`?page=login&tab=${key}`);

  return (
    <div className="login-shell">
      <div className="login-intro">
        <span className="login-intro__mark">
          <Icon name="spark" size={24} />
        </span>
        <h1>안전한 코드를, 더 빠르게. GuardrAil.</h1>
        <p>
          GuardrAil은 저장소에 연결된 코드를 자동으로 분석해 보안 취약점과 비효율을 찾아내고,
          개선된 코드와 PR까지 자동으로 제안하는 코드 품질 플랫폼입니다.
        </p>
        <div className="login-intro__features">
          <FeatureRow icon="bug" title="정적 분석 기반 취약점 탐지" desc="SQL Injection, 시크릿 노출 등 보안 이슈를 자동 탐지합니다." />
          <FeatureRow icon="code" title="개선 코드 자동 제안" desc="원본과 개선 코드를 나란히 비교하고 개선 사유를 설명합니다." />
          <FeatureRow icon="pr" title="자동 PR 생성" desc="분석 결과를 바탕으로 개선 브랜치와 PR을 자동으로 생성합니다." />
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          {activeTab === 'login' && <LoginForm onSwitchTab={switchTab} />}
          {activeTab === 'signup' && <SignupForm onSwitchTab={switchTab} />}
          {activeTab === 'find-password' && <FindPasswordForm onSwitchTab={switchTab} />}
        </div>
      </div>
    </div>
  );
}

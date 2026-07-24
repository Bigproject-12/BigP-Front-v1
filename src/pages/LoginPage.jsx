import { useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import { validatePassword, PASSWORD_HINT } from '../lib/passwordPolicy';
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
          관리자 계정: dev@GuardrAil.io/ Dev12345! (Dev 로그인과 동일)
        </span>
      </div>
    </form>
  );
}

// ... 기존 import 유지 ...

function SignupForm({ onSwitchTab }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', companyName: '', gitId: '', loginId: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 팝업 및 동의 상태 추가
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // 1차 폼 제출 (유효성 검사 후 팝업 오픈)
  const handleInitialSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('이름을 입력해주세요.');
    if (!form.gitId.trim()) return setError('Git ID를 입력해주세요.');
    if (!EMAIL_RE.test(form.loginId)) return setError('올바른 이메일 형식(@)을 입력해주세요.');
    const passwordError = validatePassword(form.password);
    if (passwordError) return setError(passwordError);
    if (form.password !== form.confirm) return setError('비밀번호가 일치하지 않습니다.');

    // 유효성 검사 통과 시 팝업 띄우기
    setShowPolicyModal(true);
  };

  // 2차 최종 제출 (팝업에서 동의 후 가입 진행)
  const handleFinalSubmit = async () => {
    if (!policyAgreed) return; // 버튼 disabled 처리로 방어하지만 이중 체크
    
    setShowPolicyModal(false);
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
    <>
      <form className="login-card__form" onSubmit={handleInitialSubmit}>
        <button type="button" className="ui-btn ui-btn--icon" onClick={() => onSwitchTab('login')} aria-label="로그인으로 돌아가기">
          <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <Input label="이름" value={form.name} onChange={set('name')} placeholder="홍길동" />
        <Input label="기업명" value={form.companyName} onChange={set('companyName')} placeholder="AIVLE" />
        <Input label="Git ID" value={form.gitId} onChange={set('gitId')} placeholder="github-username" />
        <Input label="이메일" type="email" value={form.loginId} onChange={set('loginId')} placeholder="you@company.com" />

        <Input
          label="비밀번호"
          type="password"
          value={form.password}
          onChange={set('password')}
          placeholder="비밀번호 입력"
          hint={PASSWORD_HINT}
        />
        <Input label="비밀번호 확인" type="password" value={form.confirm} onChange={set('confirm')} placeholder="비밀번호 재입력" />
        {error && <div className="ui-banner ui-banner--error">{error}</div>}
        <Button type="submit" variant="primary" block disabled={submitting}>
          {submitting ? '가입 처리 중…' : '회원가입'}
        </Button>
      </form>

      {showPolicyModal && (
        <div className="privacy-modal-overlay">
          <div className="privacy-modal">
            <h3>개인정보 처리방침 동의 (예시)</h3>
            <div className="privacy-modal-content">
              <p>GuardrAil은 서비스 제공을 위해 다음과 같이 개인정보를 수집 및 이용합니다.</p>
              <br/>
              <p>1. 수집 항목: 이름, 기업명, Git ID, 이메일, 비밀번호</p>
              <p>2. 수집 목적: 회원 식별 및 서비스 제공, 보안 취약점 분석 등</p>
              <p>3. 보유 기간: 회원 탈퇴 시까지 (또는 관련 법령에 따름)</p>
            </div>
            <label className="privacy-modal-agree">
              <input type="checkbox" checked={policyAgreed} onChange={(e) => setPolicyAgreed(e.target.checked)} />
              <span>개인정보 수집 및 이용에 동의합니다. (필수)</span>
            </label>
            <div className="privacy-modal-actions">
              <Button type="button" variant="ghost" onClick={() => setShowPolicyModal(false)}>취소</Button>
              <Button type="button" variant="primary" onClick={handleFinalSubmit} disabled={!policyAgreed}>
                동의하고 가입하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FindPasswordForm({ onSwitchTab }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('올바른 이메일 형식(@)을 입력해주세요.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/users/password/reset-code', { loginId: email });
      onSwitchTab('reset-password', { email });
    } catch (err) {
      setError(err.code === 'USER_NOT_FOUND' ? '가입되지 않은 이메일입니다.' : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="login-card__form" onSubmit={handleSubmit}>
      <button type="button" className="ui-btn ui-btn--icon" onClick={() => onSwitchTab('login')} aria-label="로그인으로 돌아가기">
        <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <p className="text-body-sm">가입한 이메일 주소를 입력하시면 인증 코드를 보내드립니다.</p>
      <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      {error && <div className="ui-banner ui-banner--error">{error}</div>}
      <Button type="submit" variant="primary" block disabled={submitting}>
        {submitting ? '전송 중…' : '인증 코드 전송'}
      </Button>
    </form>
  );
}

function ResetPasswordForm({ email, onSwitchTab }) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setCodeError('');
    setVerifying(true);
    try {
      await api.post('/api/users/password/verify-code', { loginId: email, code });
      setVerified(true);
    } catch (err) {
      setCodeError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/users/password/reset', {
        loginId: email,
        code,
        newPassword: password,
        newPasswordConfirm: confirm,
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!email) {
    return (
      <div className="login-card__form">
        <div className="ui-banner ui-banner--error">이메일 정보가 없습니다. 비밀번호 찾기를 다시 시도해주세요.</div>
        <Button variant="primary" block onClick={() => onSwitchTab('find-password')}>
          비밀번호 찾기로 돌아가기
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="login-card__form">
        <div className="ui-banner ui-banner--success">비밀번호가 재설정되었습니다. 로그인해주세요.</div>
        <Button variant="primary" block onClick={() => onSwitchTab('login')}>
          로그인하러 가기
        </Button>
      </div>
    );
  }

  if (!verified) {
    return (
      <form className="login-card__form" onSubmit={handleVerify}>
        <p className="text-body-sm">
          <strong>{email}</strong>로 보낸 인증 코드를 입력해주세요.
        </p>
        <Input
          label="인증 코드"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6자리 코드"
          autoFocus
        />
        {codeError && <div className="ui-banner ui-banner--error">{codeError}</div>}
        <Button type="submit" variant="primary" block disabled={verifying || !code}>
          {verifying ? '확인 중…' : '인증 확인'}
        </Button>
      </form>
    );
  }

  return (
    <form className="login-card__form" onSubmit={handleSubmit}>
      <div className="ui-banner ui-banner--success">인증이 확인되었습니다. 새 비밀번호를 입력해주세요.</div>
      <Input
        label="새 비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호 입력"
        hint={PASSWORD_HINT}
      />
      <Input label="새 비밀번호 확인" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <div className="ui-banner ui-banner--error">{error}</div>}
      <Button type="submit" variant="primary" block disabled={submitting}>
        {submitting ? '변경 중…' : '비밀번호 재설정'}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const { params, navigate } = useRouter();
  const tab = params.get('tab');
  const activeTab = ['login', 'signup', 'find-password', 'reset-password'].includes(tab) ? tab : 'login';

  const switchTab = (key, extraParams = {}) => {
    const query = new URLSearchParams({ page: 'login', tab: key, ...extraParams });
    navigate(`?${query.toString()}`);
  };

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
          {activeTab === 'reset-password' && <ResetPasswordForm email={params.get('email')} onSwitchTab={switchTab} />}
        </div>
      </div>
    </div>
  );
}

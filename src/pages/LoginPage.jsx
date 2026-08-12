import { useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import logoDark from '../assets/icons/logo2-login-dark.png';
import logoLight from '../assets/icons/logo2-light.png';
import { validatePassword, PASSWORD_HINT } from '../lib/passwordPolicy';
import './LoginPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PrivacyPolicyText() {
  return (
    <>
      <h1>GuardrAil 개인정보 처리방침</h1>
      <p>
        GuardrAil은(는) 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여,
        적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 이에 「개인정보 보호법」 제30조에 따라
        정보주체에게 개인정보의 처리와 보호에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고
        원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>
      <br />
      <h2>1. 개인정보의 처리 목적</h2>
      <p>
        GuardrAil은(는) 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 외의
        용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를
        받는 등 필요한 조치를 이행할 예정입니다.
      </p>
      <ul>
        <li>
          <strong>회원 가입 및 관리:</strong> 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증,
          회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지, 고충처리의 목적으로 개인정보를 처리합니다.
        </li>
      </ul>
      <br />
      <h2>2. 처리하는 개인정보의 항목</h2>
      <p>GuardrAil은(는) 회원 가입 및 서비스 제공을 위해 다음의 개인정보 항목을 정보주체의 동의를 받아 처리하고 있습니다.</p>
      <ul>
        <li><strong>수집 항목:</strong> 이름, 기업명, Git ID, 이메일, 비밀번호</li>
        <li><strong>법적 근거:</strong> 「개인정보 보호법」 제15조제1항제1호(동의)</li>
      </ul>
      <br />
      <h2>3. 개인정보의 처리 및 보유 기간</h2>
      <p>
        GuardrAil은(는) 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은
        개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.
      </p>
      <ul>
        <li><strong>보유 및 이용 기간:</strong> 회원 탈퇴 시까지</li>
        <li>다만, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지 보관합니다.</li>
      </ul>
      <br />
      <h2>4. 개인정보의 파기 절차 및 방법에 관한 사항</h2>
      <p>
        GuardrAil은(는) 개인정보 보유기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는
        지체없이 해당 개인정보를 파기합니다.
      </p>
      <ul>
        <li><strong>파기 절차:</strong> 파기 사유가 발생한 개인정보를 선정하고, 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</li>
        <li>
          <strong>파기 방법:</strong> 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 파기하며,
          종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.
        </li>
      </ul>
      <br />
      <h2>5. 정보주체와 법정대리인의 권리·의무 및 행사방법</h2>
      <ul>
        <li>정보주체는 GuardrAil에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 및 동의 철회 등을 요구할 수 있습니다.</li>
        <li>
          권리 행사는 「개인정보 보호법 시행령」 제41조제1항에 따라 서면, 전화, 전자우편 등을 통하여 하실 수 있으며,
          GuardrAil은(는) 이에 대해 지체 없이 조치하겠습니다.
        </li>
      </ul>
      <br />
      <h2>6. 개인정보의 안전성 확보조치</h2>
      <p>GuardrAil은(는) 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
      <ul>
        <li><strong>관리적 조치:</strong> 내부 관리계획 수립·시행, 정기적 직원 교육</li>
        <li><strong>기술적 조치:</strong> 개인정보처리시스템에 대한 접근 권한 관리, 접근통제시스템 설치, 개인정보의 암호화, 보안프로그램 설치 및 운영</li>
      </ul>
      <br />
      <h2>7. 개인정보 보호책임자 및 담당 부서</h2>
      <p>
        GuardrAil은(는) 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리
        및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
      </p>
      <ul>
        <li><strong>개인정보 보호책임자:</strong> [조현우/개인정보 보호책임자]</li>
        <li><strong>연락처:</strong> [010-8304-5350], [robert1215@naver.com]</li>
      </ul>
    </>
  );
}

function TermsOfServiceText() {
  return (
    <>
      <h1>GuardrAil 이용약관</h1>
      <h2>제1조 (목적)</h2>
      <p>
        이 약관은 GuardrAil(이하 "회사")이 제공하는 코드 분석 및 품질 관리 서비스(이하 "서비스")의 이용과 관련하여
        회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
      </p>
      <br />
      <h2>제2조 (정의)</h2>
      <ul>
        <li><strong>"서비스"</strong>란 회사가 제공하는 저장소 연동 코드 분석, 취약점 탐지, 개선 코드 제안 및 PR 자동 생성 등 일체의 서비스를 의미합니다.</li>
        <li><strong>"이용자"</strong>란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 회원을 말합니다.</li>
        <li><strong>"계정"</strong>이란 이용자의 식별과 서비스 이용을 위해 이용자가 설정하고 회사가 승인한 이메일 및 비밀번호의 조합을 말합니다.</li>
      </ul>
      <br />
      <h2>제3조 (약관의 효력 및 변경)</h2>
      <p>
        이 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다. 회사는 관계 법령을
        위배하지 않는 범위에서 이 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 명시하여 서비스 내
        공지사항을 통해 사전에 공지합니다.
      </p>
      <br />
      <h2>제4조 (회원가입)</h2>
      <p>
        이용자는 회사가 정한 가입 양식에 따라 필요 정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써
        회원가입을 신청하며, 회사는 이러한 신청에 대해 승낙함으로써 회원가입이 완료됩니다.
      </p>
      <br />
      <h2>제5조 (회사의 의무)</h2>
      <p>
        회사는 관계 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적인 서비스
        제공을 위하여 설비에 장애가 생기거나 멸실된 때에는 지체 없이 이를 수리 또는 복구합니다.
      </p>
      <br />
      <h2>제6조 (이용자의 의무)</h2>
      <ul>
        <li>이용자는 관계 법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 합니다.</li>
        <li>이용자는 계정 정보를 제3자에게 대여, 양도하거나 공유할 수 없으며, 계정 관리에 대한 책임은 이용자 본인에게 있습니다.</li>
        <li>이용자는 타인의 저장소 및 소스코드를 무단으로 연동하거나 서비스를 부정한 목적으로 이용해서는 안 됩니다.</li>
      </ul>
      <br />
      <h2>제7조 (서비스의 중단)</h2>
      <p>
        회사는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신두절 등의 사유가 발생한 경우에는 서비스의
        제공을 일시적으로 중단할 수 있으며, 이 경우 회사는 사전 또는 사후에 이를 공지합니다.
      </p>
      <br />
      <h2>제8조 (계약 해지 및 이용 제한)</h2>
      <p>
        이용자는 언제든지 서비스 내 설정 메뉴 또는 고객센터를 통해 이용계약 해지(회원탈퇴)를 신청할 수 있으며,
        회사는 이용자가 이 약관의 의무를 위반한 경우 사전 통지 후 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
      </p>
      <br />
      <h2>제9조 (책임제한)</h2>
      <p>
        회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한
        책임이 면제됩니다. 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.
      </p>
      <br />
      <h2>제10조 (준거법 및 재판관할)</h2>
      <p>
        이 약관과 관련하여 회사와 이용자 간에 발생한 분쟁에 대해서는 대한민국 법을 준거법으로 하며, 분쟁으로 인한
        소송은 민사소송법상의 관할 법원에 제기합니다.
      </p>
      <br />
      <p className="text-caption-md">부칙: 이 약관은 공고일로부터 시행합니다.</p>
    </>
  );
}

function InfoModal({ title, onClose, children }) {
  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="privacy-modal-content">{children}</div>
        <div className="privacy-modal-actions">
          <Button type="button" variant="primary" onClick={onClose}>닫기</Button>
        </div>
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
            <h3>GuardrAil 개인정보 처리방침</h3>
            <div className="privacy-modal-content">
              <PrivacyPolicyText />
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
        <button type="button" className="ui-btn ui-btn--icon" onClick={() => onSwitchTab('find-password')} aria-label="이전으로 돌아가기">
          <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
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
      <button type="button" className="ui-btn ui-btn--icon" onClick={() => onSwitchTab('find-password')} aria-label="이전으로 돌아가기">
        <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
      </button>
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
  const { theme, toggleTheme } = useTheme();
  const logoIcon = theme === 'dark' ? logoDark : logoLight;
  const tab = params.get('tab');
  const activeTab = ['login', 'signup', 'find-password', 'reset-password'].includes(tab) ? tab : 'login';
  const [footerModal, setFooterModal] = useState(null); // 'privacy' | 'terms' | null

  const switchTab = (key, extraParams = {}) => {
    const query = new URLSearchParams({ page: 'login', tab: key, ...extraParams });
    navigate(`?${query.toString()}`);
  };

  return (
    <div className="login-shell">
      <Button
        variant="icon"
        className="login-shell__theme-toggle"
        aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        onClick={toggleTheme}
      >
        <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
      </Button>

      <div className="login-card">
        <div className="login-card__brand">
          <img src={logoIcon} alt="" className="login-card__brand-mark" />
          <span className="login-card__brand-text">GuardrAil</span>
        </div>
        {activeTab === 'login' && <LoginForm onSwitchTab={switchTab} />}
        {activeTab === 'signup' && <SignupForm onSwitchTab={switchTab} />}
        {activeTab === 'find-password' && <FindPasswordForm onSwitchTab={switchTab} />}
        {activeTab === 'reset-password' && <ResetPasswordForm email={params.get('email')} onSwitchTab={switchTab} />}

        <footer className="login-shell__footer">
          <button type="button" onClick={() => setFooterModal('privacy')}>개인정보처리방침</button>
          <span>|</span>
          <button type="button" onClick={() => setFooterModal('terms')}>이용약관</button>
        </footer>
      </div>

      {footerModal === 'privacy' && (
        <InfoModal title="GuardrAil 개인정보 처리방침" onClose={() => setFooterModal(null)}>
          <PrivacyPolicyText />
        </InfoModal>
      )}
      {footerModal === 'terms' && (
        <InfoModal title="GuardrAil 이용약관" onClose={() => setFooterModal(null)}>
          <TermsOfServiceText />
        </InfoModal>
      )}
    </div>
  );
}

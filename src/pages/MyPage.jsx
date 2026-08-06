import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRepos } from '../context/RepoContext';
import { useRouter } from '../router/RouterContext';
import { useConfirm } from '../context/ConfirmContext';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Icon from '../components/icons/Icon';
import { PASSWORD_HINT } from '../lib/passwordPolicy';
import './MyPage.css';

function ChangePasswordModal({ onClose }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.patch('/api/users/password', { currentPassword: current, newPassword: next, newPasswordConfirm: confirm });
      onClose(true);
    } catch (err) {
      setError(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title="비밀번호 변경"
      onClose={() => onClose(false)}
      actions={
        <>
          <Button variant="secondary" onClick={() => onClose(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : '변경하기'}
          </Button>
        </>
      }
    >
      <div className="modal-form">
        <Input label="현재 비밀번호" type={showPw ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} rightSlot={<button type="button" className="ui-field__icon-right" onClick={() => setShowPw(v => !v)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}><Icon name={showPw ? 'eyeOff' : 'eye'} size={17} /></button>} />
        <Input
          label="새 비밀번호"
          type={showPw ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          hint={PASSWORD_HINT}
        />
        <Input label="새 비밀번호 확인" type={showPw ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <div className="ui-banner ui-banner--error">{error}</div>}
      </div>
    </Modal>
  );
}

function WithdrawModal({ onClose, onConfirm }) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { confirm: confirmDialog, alertDialog } = useConfirm();

  const handleSubmit = async () => {
    if (!password) {
      alertDialog('비밀번호를 입력해주세요.');
      return;
    }
    if (!(await confirmDialog('정말 탈퇴하시겠습니까? 모든 정보가 삭제됩니다.'))) return;

    setSubmitting(true);
    await onConfirm(password);
    setSubmitting(false);
  };

  return (
    <Modal
      title="회원 탈퇴"
      onClose={() => onClose(false)}
      actions={
        <>
          <Button variant="secondary" onClick={() => onClose(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} style={{ backgroundColor: '#d32f2f', borderColor: '#d32f2f', color: 'white' }}>
            {submitting ? '처리 중…' : '탈퇴하기'}
          </Button>
        </>
      }
    >
      <div className="modal-form">
        <p className="text-body-sm" style={{ color: '#d32f2f' }}>
          탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다. 계속하시려면 현재 비밀번호를 입력해주세요.
        </p>
        <Input
          label="현재 비밀번호"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          rightSlot={
            <button type="button" className="ui-field__icon-right" onClick={() => setShowPw(v => !v)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}>
              <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} />
            </button>
          }
        />
      </div>
    </Modal>
  );
}

export default function MyPage() {
  const { user, persistUser } = useAuth();
  const { repos, refreshRepos } = useRepos();
  const { params, navigate } = useRouter();
  const { alertDialog } = useConfirm();

  const [name, setName] = useState(user?.name || '');
  const [gitId, setGitId] = useState(user?.gitName || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  const [org, setOrg] = useState('');
  const [initialOrg, setInitialOrg] = useState('');
  const [tokenBanner, setTokenBanner] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // 이미 등록된 조직명 있다면 화면에 표시하거나 초기값 세팅
  useEffect(() => {
    if (repos && repos.length > 0 && repos[0].organization && !initialOrg) {
      const fetchedOrg = repos[0].organization;
      setInitialOrg(fetchedOrg);
      setOrg(fetchedOrg);
    }
  }, [repos, initialOrg]);

  // GitHub OAuth 콜백에서 리다이렉트되어 돌아왔을 때 결과 배너 표시 + Repository 목록 새로고침
  useEffect(() => {
    const githubResult = params.get('github');
    if (githubResult === 'success') {
      setTokenBanner({ type: 'success', text: 'GitHub 연동 및 Repository 가져오기가 완료되었습니다.' });
      refreshRepos();
      navigate('?page=mypage#github-section', { replace: true });
    } else if (githubResult === 'partial') {
      setTokenBanner({ type: 'error', text: 'GitHub 계정은 연동됐지만, Repository 조회에 실패했습니다. 조직명을 확인해주세요.' });
      navigate('?page=mypage#github-section', { replace: true });
    } else if (githubResult === 'error') {
      setTokenBanner({ type: 'error', text: 'GitHub 연동에 실패했습니다. 다시 시도해주세요.' });
      navigate('?page=mypage#github-section', { replace: true });
    }
    if (githubResult) setTimeout(() => setTokenBanner(null), 4000);
  }, [params]);

  useEffect(() => {
    setName(user?.name || '');
    setGitId(user?.gitName || '');
  }, [user]);

  // 깃허브 등록 부분까지 스크롤되는 기능
  useEffect(() => {
    if (window.location.hash.includes('github-section')) {
      const el = document.getElementById('github-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  if (!user) return null;

  const isDirty = name !== user.name || gitId !== user.gitName;

  const handleCancel = () => {
    setName(user.name);
    setGitId(user.gitName);
    setBanner(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setBanner(null);
    try {
      await persistUser({ name, gitId });
      setBanner({ type: 'success', text: '회원정보가 저장되었습니다.' });
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // GitHub OAuth 인증 시작 — 입력된 조직명을 state에 함께 실어 보냄
  // 콜백에서 토큰 저장 + 해당 조직의 Repository 조회까지 서버가 한 번에 처리한다.
  const handleConnectGithub = async () => {
    const trimmedOrg = org.trim();
    if (!trimmedOrg) {
      setTokenBanner({ type: 'error', text: '조직명을 먼저 입력해주세요.' });
      return;
    }
    setConnecting(true);
    setTokenBanner(null);
    try {
      const { url } = await api.get(`/api/github/oauth/authorize-url?orgName=${encodeURIComponent(trimmedOrg)}`);
      window.location.href = url;
    } catch (err) {
      setTokenBanner({ type: 'error', text: err.message || 'GitHub 연동 시작에 실패했습니다.' });
      setConnecting(false);
    }
  };

  // 탈퇴 api 호출
  const executeWithdraw = async (password) => {
    try {
      await api.del('/api/users/me', { currentPassword: password });

      const currentTheme = localStorage.getItem('GuardrAil-theme');
      localStorage.clear();
      if (currentTheme) {
        localStorage.setItem('GuardrAil-theme', currentTheme);
      }
      sessionStorage.clear();

      await alertDialog('회원 탈퇴가 완료되었습니다.');
      window.location.href = '?page=login';
    } catch (error) {
      alertDialog(error.message);
    }
  };

  return (
    <>
      <div className="mypage-head">
        <span className="mypage-avatar">
          <Icon name="user" size={26} />
        </span>
        <h1 className="text-display-md">내 정보</h1>
      </div>

      <Card>
        <div className="mypage-form">
          <Input label="기업명" value={user.companyName ?? ''} readOnly disabled />
          <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="아이디" value={user.loginId ?? ''} readOnly disabled hint="로그인 ID는 변경할 수 없습니다." />

          <div className="mypage-row">
            <Input label="비밀번호" value="••••••••••" readOnly disabled type="password" />
            <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
              비밀번호 변경
            </Button>
          </div>

          <Input label="Git ID" value={gitId} onChange={(e) => setGitId(e.target.value)} placeholder="github-username" />

          {banner && <div className={`ui-banner ui-banner--${banner.type}`}>{banner.text}</div>}

          <div className="mypage-actions" style={{ justifyContent: 'space-between' }}>
            {user.role !== 'ADMIN' && (
              <Button variant="secondary" onClick={() => setShowWithdrawModal(true)} style={{ color: '#d32f2f', borderColor: '#d32f2f' }}>
                회원 탈퇴
              </Button>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button variant="secondary" onClick={handleCancel} disabled={!isDirty}>
                취소
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={!isDirty || saving}>
                {saving ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card id="github-section">
        <div className="mypage-form">
          <h2 className="text-body-md" style={{ fontWeight: 600 }}>GitHub 연동</h2>

          {initialOrg && (
            <div className="ui-banner ui-banner--success">
              현재 <strong>{initialOrg}</strong> 조직으로 GitHub가 연동되어 있습니다.
            </div>
          )}

          <Input
            label="GitHub 조직명 (Organization)"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="ex) Bigproject-12"
            hint="팀원 모두 동일한 조직명을 입력하면 같은 대시보드를 공유합니다."
          />

          {tokenBanner && <div className={`ui-banner ui-banner--${tokenBanner.type}`}>{tokenBanner.text}</div>}

          <div className="mypage-actions">
            <Button variant="primary" onClick={handleConnectGithub} disabled={connecting}>
              {connecting ? '연동 페이지로 이동 중…' : 'GitHub 계정 연동하기'}
            </Button>
          </div>
        </div>
      </Card>

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={(success) => {
            setShowPasswordModal(false);
            if (success) setBanner({ type: 'success', text: '비밀번호가 변경되었습니다.' });
          }}
        />
      )}

      {showWithdrawModal && (
        <WithdrawModal
          onClose={() => setShowWithdrawModal(false)}
          onConfirm={executeWithdraw}
        />
      )}
    </>
  );
}
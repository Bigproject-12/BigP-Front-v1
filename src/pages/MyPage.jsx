import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRepos } from '../context/RepoContext';
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
    // 현재 비밀번호 불일치 -> 새/확인 불일치 -> 길이 -> 복잡도 -> 현재 비밀번호와 동일,
    // 이 우선순위는 서버(UserService.changePassword)가 순서대로 검증해 그대로 내려준다.
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

  const handleSubmit = async () => {
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    if (!window.confirm('정말 탈퇴하시겠습니까? 모든 정보가 삭제됩니다.')) return;

    setSubmitting(true);
    await onConfirm(password); // 부모 컴포넌트의 API 호출 함수 실행
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
  const { refreshRepos } = useRepos();
  const [name, setName] = useState(user?.name || '');
  const [gitId, setGitId] = useState(user?.gitName || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  const {repos}=useRepos();

  const [org, setOrg] = useState('');
  const [token, setToken] = useState('');
  const [initialOrg, setInitialOrg] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenBanner, setTokenBanner] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);


  //이미 등록된 조직명 있다면 화면에 표시하거나 초기값 세팅
  useEffect(() => {
    if (repos && repos.length > 0 && repos[0].organization && !initialOrg) {
      const fetchedOrg = repos[0].organization;
      setInitialOrg(fetchedOrg);
      setOrg(fetchedOrg); // 입력란의 초기값으로도 세팅
    }
    }, [repos, initialOrg]);


  const handleSaveToken = async () => {
    const trimmedOrg = org.trim();
    const trimmedToken = token.trim();
    if (!trimmedToken || !trimmedOrg) {
      setTokenBanner({ type: 'error', text: '조직명과 토큰을 모두 입력해주세요.' });
      return;
    }
    try {
      await api.post('/api/repos', { githubToken: trimmedToken, orgName: trimmedOrg });
      await refreshRepos();
      setInitialOrg(trimmedOrg); // ✅ 저장이 성공하면 초기 연동 조직명도 갱신
      setTokenBanner({ type: 'success', text: '연동되었습니다.' });
    } catch (err) {
      setTokenBanner({ type: 'error', text: err.message || '연동에 실패했습니다.' });
    }
    setTimeout(() => setTokenBanner(null), 3000);
  };

  useEffect(() => {
    setName(user?.name || '');
    setGitId(user?.gitName || '');
  }, [user]);

  //깃허브 등록 부분까지 스크롤되는 기능 추가 
  useEffect(() => {
  if (window.location.hash.includes('github-section')) {
    const el = document.getElementById('github-section');
    if (el) {
      // 부드럽게 스크롤 되도록 smooth 옵션 적용
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

  //탈퇴 api 호출
  const executeWithdraw = async (password) => {
    try {
      await api.del('/api/users/me', { currentPassword: password });

      // 테마만 남기고 로컬스토리지 정리
      // 프로젝트의 테마 키로 맞출 것
      const currentTheme = localStorage.getItem('GuardrAil-theme');
      localStorage.clear();
      if (currentTheme) {
        localStorage.setItem('GuardrAil-theme', currentTheme);
      }
      // 로그인 토큰/유저 정보는 sessionStorage에 저장되므로 별도로 정리
      sessionStorage.clear();

      alert('회원 탈퇴가 완료되었습니다.');
      window.location.href = '?page=login'; 
    } catch (error) {
      alert(error.message);
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
            {/* 위험 버튼은 눈에 띄지 않게 secondary나 빨간색 스타일(위험 강조)로 배치 */}
            
            {user.role!=='ADMIN'&&(
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

          {/* 등록 상태 안내 배너 추가 */}
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
          <div className="mypage-row">
            <Input
              label="Personal Access Token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              hint="GitHub Personal Access Token을 입력하세요. (repo 권한 필요)"
            />
            <Button variant="secondary" onClick={() => setShowToken((v) => !v)}>
              {showToken ? '숨기기' : '보기'}
            </Button>
          </div>
          {tokenBanner && <div className={`ui-banner ui-banner--${tokenBanner.type}`}>{tokenBanner.text}</div>}
          <div className="mypage-actions">
            <Button variant="primary" onClick={handleSaveToken}>
              토큰 저장
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
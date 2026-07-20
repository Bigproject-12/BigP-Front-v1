import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { GITHUB_TOKEN_KEY, GITHUB_ORG_KEY } from '../lib/github';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Icon from '../components/icons/Icon';
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
    if (next.length < 8) {
      setError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (next !== confirm) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('GuardrAil-token');
      const res = await fetch('http://localhost:8081/api/users/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next, newPasswordConfirm: confirm }),
      });
      if (res.status === 401) { setError('현재 비밀번호가 올바르지 않습니다.'); return; }
      if (!res.ok) throw new Error('비밀번호 변경에 실패했습니다.');
      onClose(true);
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
        <Input label="새 비밀번호" type={showPw ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} />
        <Input label="새 비밀번호 확인" type={showPw ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <div className="ui-banner ui-banner--error">{error}</div>}
      </div>
    </Modal>
  );
}

export default function MyPage() {
  const { user, persistUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [gitId, setGitId] = useState(user?.gitId || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  const [org, setOrg] = useState(() => localStorage.getItem(GITHUB_ORG_KEY) ?? ''); // 백엔드 연결되면 const [org, setOrg] = useState('') 으로 변경, 뒤에 다 날림
  const [token, setToken] = useState(() => localStorage.getItem(GITHUB_TOKEN_KEY) ?? ''); // 백엔드 연결되면 const [token, setToken] = useState('') 으로 변경
  const [showToken, setShowToken] = useState(false);
  const [tokenBanner, setTokenBanner] = useState(null);

  const handleSaveToken = async () => {
    const trimmedOrg = org.trim();
    const trimmedToken = token.trim();
    //백엔드 연결 시 아래 구문 제거
    trimmedOrg ? localStorage.setItem(GITHUB_ORG_KEY, trimmedOrg) : 
    localStorage.removeItem(GITHUB_ORG_KEY);
    trimmedToken ? localStorage.setItem(GITHUB_TOKEN_KEY, trimmedToken) : 
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    //여기까지 제거
    if (trimmedToken) {
      try {
        await fetch('http://localhost:8081/api/repos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('GuardrAil-token')}` },
          body: JSON.stringify({ githubToken: trimmedToken }),
        });
      } catch {}
    }
    setTokenBanner({ type: 'success', text: '저장되었습니다.' });
    setTimeout(() => setTokenBanner(null), 3000);
  };

  useEffect(() => {
    setName(user?.name || '');
    setGitId(user?.gitId || '');
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

  const isDirty = name !== user.name || gitId !== user.gitId;

  const handleCancel = () => {
    setName(user.name);
    setGitId(user.gitId);
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
          <Input label="기업명" value={user.company} readOnly disabled />
          <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="아이디" value={user.email} readOnly disabled hint="로그인 ID는 변경할 수 없습니다." />

          <div className="mypage-row">
            <Input label="비밀번호" value="••••••••••" readOnly disabled type="password" />
            <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
              비밀번호 변경
            </Button>
          </div>

          <Input label="Git ID" value={gitId} onChange={(e) => setGitId(e.target.value)} placeholder="github-username" />

          {banner && <div className={`ui-banner ui-banner--${banner.type}`}>{banner.text}</div>}

          <div className="mypage-actions">
            <Button variant="secondary" onClick={handleCancel} disabled={!isDirty}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!isDirty || saving}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      </Card>

      <Card id="github-section">
        <div className="mypage-form">
          <h2 className="text-body-md" style={{ fontWeight: 600 }}>GitHub 연동</h2>
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
    </>
  );
}

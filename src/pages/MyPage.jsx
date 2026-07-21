import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Icon from '../components/icons/Icon';
import './MyPage.css';

// 로컬 스토리지 키 정의
const GITHUB_ORG_KEY = 'bigp-github-org';
const GITHUB_TOKEN_KEY = 'bigp-github-token';

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
    if (next.length < 8 || next.length > 18) {
      setError('비밀번호는 8자 이상 18자 이하여야 하며 영문 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.');
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.message || '비밀번호 변경에 실패했습니다.');
        return;
      }
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
          <Button variant="secondary" onClick={() => onClose(false)}>취소</Button>
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

// GitHub 연동 모달 추가
function GithubIntegrationModal({ onClose, currentOrg }) {
  const [org, setOrg] = useState(currentOrg !== '미등록' ? currentOrg : '');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError('');
    const trimmedOrg = org.trim();
    const trimmedToken = token.trim();

    if (!trimmedOrg) {
      setError('조직명(Organization)을 입력해주세요.');
      return;
    }

    const payload = { orgName: trimmedOrg };
    if (trimmedToken) {
      payload.githubToken = trimmedToken;
    }

    setSaving(true);
    try {
      // 1. 백엔드로 데이터 전송
      const res = await fetch('http://localhost:8081/api/repos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${localStorage.getItem('GuardrAil-token')}` 
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('저장에 실패했습니다.');
      
      // 2. 프론트엔드 연동 유지를 위해 로컬 스토리지에 동시 저장
      localStorage.setItem(GITHUB_ORG_KEY, trimmedOrg);
      if (trimmedToken) {
        localStorage.setItem(GITHUB_TOKEN_KEY, trimmedToken);
      }

      onClose(true); // 성공 상태 전달
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="GitHub 연동 관리"
      onClose={() => onClose(false)}
      actions={
        <>
          <Button variant="secondary" onClick={() => onClose(false)}>취소</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : '저장하기'}
          </Button>
        </>
      }
    >
      <div className="modal-form">
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
            placeholder="새로운 토큰으로 변경하려면 입력하세요"
            hint="GitHub Personal Access Token을 입력하세요. (repo 권한 필요)"
          />
          <Button variant="secondary" onClick={() => setShowToken((v) => !v)}>
            {showToken ? '숨기기' : '보기'}
          </Button>
        </div>
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
  const [showGithubModal, setShowGithubModal] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  // 로컬 스토리지 데이터 상태
  const [localOrg, setLocalOrg] = useState('미등록');
  const [hasLocalToken, setHasLocalToken] = useState(false);

  // 로컬 스토리지에서 값 읽어오기 (초기 마운트 및 모달 닫힐 때 실행)
  useEffect(() => {
    const savedOrg = localStorage.getItem(GITHUB_ORG_KEY);
    const savedToken = localStorage.getItem(GITHUB_TOKEN_KEY);

    if (savedOrg) setLocalOrg(savedOrg);
    if (savedToken) setHasLocalToken(true);
  }, [showGithubModal]);

  useEffect(() => {
    setName(user?.name || '');
    setGitId(user?.gitId || '');
  }, [user]);

  useEffect(() => {
    if (window.location.hash.includes('github-section')) {
      const el = document.getElementById('github-section');
      if (el) {
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
            value={localOrg} 
            readOnly 
            disabled 
          />
          
          <div className="mypage-row">
            <Input 
              label="Personal Access Token" 
              value={hasLocalToken ? '••••••••••••••••' : '미등록'} 
              type="password" 
              readOnly 
              disabled 
            />
            <Button variant="secondary" onClick={() => setShowGithubModal(true)}>
              {hasLocalToken ? '연동 정보 변경' : 'GitHub 연동하기'}
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

      {showGithubModal && (
        <GithubIntegrationModal
          currentOrg={localOrg}
          onClose={(success) => {
            setShowGithubModal(false);
            if (success) setBanner({ type: 'success', text: 'GitHub 연동 정보가 저장되었습니다.' });
          }}
        />
      )}
    </>
  );
}
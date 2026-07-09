import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
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

  const handleSave = async () => {
    setError('');
    const record = await api.get(`/users/${user.id}`);
    if (record.password !== current) {
      setError('현재 비밀번호가 올바르지 않습니다.');
      return;
    }
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
      await api.patch(`/users/${user.id}`, { password: next });
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
        <Input label="현재 비밀번호" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="새 비밀번호" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <Input label="새 비밀번호 확인" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
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

  useEffect(() => {
    setName(user?.name || '');
    setGitId(user?.gitId || '');
  }, [user]);

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

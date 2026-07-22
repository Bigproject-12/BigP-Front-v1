import { useEffect, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { TOKEN_KEY } from '../lib/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Icon from '../components/icons/Icon';
import './MemberDetailPage.css';

const ROLE_LABELS = {
  ADMIN: '운영자',
  USER: '일반회원',
};

const DELETE_CONFIRM_WORD = 'DELETE';

function InfoRow({ label, value }) {
  return (
    <div className="member-detail__row">
      <span className="member-detail__label">{label}</span>
      <span className="member-detail__value">{value ?? '-'}</span>
    </div>
  );
}

function DeleteMemberModal({ memberName, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isConfirmed = confirmText === DELETE_CONFIRM_WORD;

  const handleSubmit = async () => {
    if (!isConfirmed) return;
    setSubmitting(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="회원 삭제"
      onClose={() => onClose(false)}
      actions={
        <>
          <Button variant="secondary" onClick={() => onClose(false)}>
            취소
          </Button>
          <Button variant="danger" onClick={handleSubmit} disabled={!isConfirmed || submitting}>
            {submitting ? '삭제 중…' : '삭제하기'}
          </Button>
        </>
      }
    >
      <div className="modal-form">
        <p className="text-body-sm">
          <strong>{memberName}</strong> 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          계속하려면 아래 입력란에 <strong>{DELETE_CONFIRM_WORD}</strong>를 입력해주세요.
        </p>
        <Input
          label={`확인을 위해 "${DELETE_CONFIRM_WORD}"를 입력하세요`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoFocus
        />
        {error && <div className="ui-banner ui-banner--error">{error}</div>}
      </div>
    </Modal>
  );
}

export default function MemberDetailPage() {
  const { params, navigate } = useRouter();
  const memberId = params.get('memberId');

  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    const fetchMember = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const res = await fetch(`http://localhost:8081/api/users/${memberId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message ?? '회원 정보를 불러오지 못했습니다.');
        }
        setMember(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [memberId]);

  const handleDeleteConfirm = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`http://localhost:8081/api/users/${memberId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? '회원 삭제에 실패했습니다.');
    }
    navigate('?page=members');
  };

  if (!memberId) {
    return <div className="ui-banner ui-banner--error">회원을 찾을 수 없습니다.</div>;
  }
  if (loading) return <div className="members-page__state">불러오는 중…</div>;
  if (error) return <div className="ui-banner ui-banner--error">{error}</div>;

  return (
    <>
      <div className="member-detail__head">
        <button
          className="ui-btn ui-btn--icon"
          onClick={() => navigate('?page=members')}
          aria-label="목록으로"
        >
          <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="member-detail__avatar">
          <Icon name="user" size={22} />
        </span>
        <div>
          <h1 className="text-display-md">{member.name}</h1>
          <span className="text-body-sm">{member.companyName}</span>
        </div>
        {member.role && (
          <Badge variant={member.role === 'ADMIN' ? 'info' : 'neutral'}>
            {ROLE_LABELS[member.role] ?? member.role}
          </Badge>
        )}
        {member.role !== 'ADMIN' && (
          <Button
            variant="danger"
            className="member-detail__delete-btn"
            onClick={() => setShowDeleteModal(true)}
          >
            회원 삭제
          </Button>
        )}
      </div>

      <Card>
        <div className="member-detail__grid">
          <InfoRow label="회원 ID" value={member.id} />
          <InfoRow label="이름" value={member.name} />
          <InfoRow label="아이디" value={member.loginId} />
          <InfoRow label="기업명" value={member.companyName} />
          <InfoRow label="Git ID" value={member.gitId} />
          <InfoRow label="가입일" value={member.createdAt} />
        </div>
      </Card>

      {showDeleteModal && (
        <DeleteMemberModal
          memberName={member.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { TOKEN_KEY } from '../lib/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import './MemberDetailPage.css';

const ROLE_LABELS = {
  ADMIN: '운영자',
  USER: '일반회원',
};

function InfoRow({ label, value }) {
  return (
    <div className="member-detail__row">
      <span className="member-detail__label">{label}</span>
      <span className="member-detail__value">{value ?? '-'}</span>
    </div>
  );
}

export default function MemberDetailPage() {
  const { params, navigate } = useRouter();
  const memberId = params.get('memberId');

  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
    </>
  );
}

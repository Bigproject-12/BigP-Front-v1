import { useEffect, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { TOKEN_KEY } from '../lib/api';
import Card from '../components/ui/Card';
import './MembersPage.css';

export default function MembersPage() {
  const { navigate } = useRouter();
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const res = await fetch('http://localhost:8081/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message ?? '회원 목록을 불러오지 못했습니다.');
        }
        const data = await res.json();
        setMembers(data.content); // Page 객체라 실제 목록은 content 안에 있음
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  if (loading) return <div className="members-page__state">불러오는 중…</div>;
  if (error) return <div className="ui-banner ui-banner--error">{error}</div>;

  return (
    <Card>
      <div className="members-page__header">
        <h2 className="members-page__title">회원 목록</h2>
        <span className="members-page__count">총 {members.length}명</span>
      </div>
      <table className="members-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>이름</th>
            <th>회사</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.id}
              className="members-table__row"
              onClick={() => navigate(`?page=member-detail&memberId=${m.id}`)}
            >
              <td>{m.id}</td>
              <td>{m.name}</td>
              <td>{m.companyName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
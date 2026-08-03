import { useEffect, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useFavorites } from '../context/FavoritesContext';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import './RepoListPage.css';

export default function MySpacePage() {
  const { navigate, params } = useRouter();
  const { favorites } = useFavorites();
  
  // 👈 params가 null일 경우를 대비해 안전하게 처리
  const repoIdParam = params?.get ? params.get('repoId') : null;
  const selectedRepoId = repoIdParam || (favorites.length > 0 ? favorites[0].id : null);
  
  const [branch, setBranch] = useState('main');
  const [summary, setSummary] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. 요약 및 분석 목록 데이터 불러오기
  useEffect(() => {
    if (!selectedRepoId) return;
    
    setLoading(true);
    
    // 요약 API 호출
    api.get(`/api/my-space/repos/${selectedRepoId}/summary?branch=${branch}`)
      .then((res) => setSummary(res))
      .catch(() => setSummary(null));

    // 분석 목록 API 호출
    api.get(`/api/my-space/repos/${selectedRepoId}/analyses?branch=${branch}&page=1&size=10`)
      .then((res) => setAnalyses(res))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, [selectedRepoId, branch]);

  if (favorites.length === 0) {
    return (
      <div className="ui-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0' }}>
        <Icon name="star" size={28} />
        <span style={{ color: 'var(--text-muted)' }}>즐겨찾기한 Repository가 없습니다.</span>
        <Button variant="primary" onClick={() => navigate('?page=repolist')}>
          Repository 목록으로 가기
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">My Space</h1>
          <span className="text-body-sm">즐겨찾는 프로젝트의 심층 코드 분석 및 요약 지표를 확인하세요.</span>
        </div>
      </div>

      {/* 레포지토리 탭 또는 선택 영역 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto' }}>
        {favorites.map((repo) => (
          <Button
            key={repo.id}
            variant={String(repo.id) === String(selectedRepoId) ? 'primary' : 'secondary'}
            onClick={() => navigate(`?page=myspace&repoId=${repo.id}`)}
          >
            {repo.name}
          </Button>
        ))}
      </div>

      {/* 요약 카드 섹션 */}
      {summary && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <Card style={{ padding: '20px' }}>
            <span className="text-caption-md" style={{ color: 'var(--text-muted)' }}>전체 이슈 건수</span>
            <h2 className="text-heading-lg" style={{ margin: '8px 0 0' }}>{summary.totalIssues}건</h2>
          </Card>
          <Card style={{ padding: '20px' }}>
            <span className="text-caption-md" style={{ color: 'var(--text-muted)' }}>보안 이슈</span>
            <h2 className="text-heading-lg" style={{ margin: '8px 0 0', color: 'var(--error)' }}>{summary.securityIssues}건</h2>
          </Card>
          <Card style={{ padding: '20px' }}>
            <span className="text-caption-md" style={{ color: 'var(--text-muted)' }}>품질 점수</span>
            <h2 className="text-heading-lg" style={{ margin: '8px 0 0' }}>{summary.qualityScore}점</h2>
          </Card>
          <Card style={{ padding: '20px' }}>
            <span className="text-caption-md" style={{ color: 'var(--text-muted)' }}>개선 가능률</span>
            <h2 className="text-heading-lg" style={{ margin: '8px 0 0' }}>
              {summary.improvableRatio ? `${summary.improvableRatio}%` : '-'}
            </h2>
          </Card>
        </div>
      )}

      {/* 파일별 분석 이력 테이블 */}
      <Card style={{ padding: 0 }}>
        <div className="chart-card__header" style={{ padding: '16px 16px 0' }}>
          <h2 className="text-heading-md">분석 히스토리 ({branch})</h2>
        </div>
        {loading ? (
          <div className="ui-empty" style={{ padding: '40px' }}>불러오는 중…</div>
        ) : analyses.length === 0 ? (
          <div className="ui-empty" style={{ padding: '40px' }}>분석 이력이 없습니다.</div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>파일 경로</th>
                <th>상태</th>
                <th>이슈 수</th>
                <th>품질 점수</th>
                <th>분석 일시</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((item) => (
                <tr 
                  key={item.analysisId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`?page=analysis-detail&analysisId=${item.analysisId}`)}
                >
                  <td>{item.filePath || '(파일 미지정)'}</td>
                  <td><Badge variant={item.status === 'COMPLETED' ? 'success' : 'warning'}>{item.status}</Badge></td>
                  <td>{item.totalIssueCount != null ? `${item.totalIssueCount}건` : '-'}</td>
                  <td>{item.qualityScore != null ? `${item.qualityScore}점` : '-'}</td>
                  <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
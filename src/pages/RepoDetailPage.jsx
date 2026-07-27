import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useRepos } from '../context/RepoContext';
import { formatDateTime, languageColor } from '../lib/format';
import { Tabs, Segment } from '../components/ui/Tabs';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import { api } from '../lib/api'; 
import './RepoDetailPage.css';

const TOP_TABS = [
  { key: 'history', label: '히스토리' },
  { key: 'analyze', label: '코드 분석' },
];

const STATUS_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'in_progress', label: '진행중' },
  { key: 'done', label: '완료' },
];

export default function RepoDetailPage() {
  const { params, navigate } = useRouter();
  const repoId = params.get('repoId');

  const { repos } = useRepos();
  const repo = repos.find((r) => String(r.id) === repoId) || null;

  const [analyses, setAnalyses] = useState([]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');


  useEffect(() => {
    if (!repoId) return;
    api.get(`/api/repos/${repoId}/history`)
      .then(setAnalyses)
      .catch(() => setAnalyses([]));
  }, [repoId]);

const visibleAnalyses = useMemo(() => {
    return analyses.filter((a) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'done' && a.status === 'COMPLETED') ||
        (status === 'in_progress' && a.status === 'ANALYZING');
      const fileName = a.filePath ? a.filePath.split('/').pop() : '';
      const matchesQuery = !query.trim() || fileName.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [analyses, status, query]);

  const handleTabChange = (key) => {
    if (key === 'analyze') {
      navigate(`/Analyze?repoId=${repoId}`);
    }
  };

  if (!repoId) {
    return <div className="ui-banner ui-banner--error">레포지토리를 찾을 수 없습니다.</div>;
  }

  return (
    <>
      <div className="repo-detail__head">
        <div className="repo-detail__title">
          <button className="ui-btn ui-btn--icon" onClick={() => navigate('?page=repolist')} aria-label="목록으로">
            <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <h1 className="text-display-md">{repo ? repo.name : '불러오는 중…'}</h1>
            {repo && <span className="text-body-sm">{repo.description}</span>}
          </div>
        </div>
        {repo && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge variant={repo.private ? 'neutral' : 'info'}>{repo.private ? '비공개' : '공개'}</Badge>
            <Badge variant="outline">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: languageColor(repo.language) }} />
                {repo.language}
              </span>
            </Badge>
          </div>
        )}
      </div>

      <Tabs items={TOP_TABS} active="history" onChange={handleTabChange} />

      <div className="repo-detail__toolbar">
        <div className="repo-detail__toolbar-left">
          <Segment items={STATUS_FILTERS} active={status} onChange={setStatus} />
        </div>
        <div className="repo-detail__search">
          <Input
            placeholder="파일명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Icon name="search" size={16} />}
          />
        </div>
      </div>

      <Card style={{ padding: 0, overflowX: 'auto' }}>
        <table className="history-table">
          <thead>
            <tr>
              <th>프로젝트 (파일명)</th>
              <th>분석일시</th>
              <th>이슈 수</th>
              <th>개선율</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleAnalyses.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="ui-empty">분석 이력이 없습니다.</div>
                </td>
              </tr>
            ) : (
             visibleAnalyses.map((a) => {
                const fileName = a.filePath ? a.filePath.split('/').pop() : '(파일 미지정)';
                const statusMap = {
                  COMPLETED: { label: '완료', variant: 'success' },
                  ANALYZING: { label: '진행중', variant: 'warning' },
                  FAILED: { label: '실패', variant: 'error' },
                  CANCELED: { label: '취소', variant: 'neutral' },
                };
                const st = statusMap[a.status] || { label: a.status, variant: 'neutral' };
                return (
                  <tr key={a.id}>
                    <td>
                      <span className="history-table__file">
                        <Icon name="code" size={15} />
                        {fileName}
                      </span>
                    </td>
                    <td>{formatDateTime(a.analyzedAt)}</td>
                    <td>{a.issueCount != null ? `${a.issueCount}건` : '-'}</td>
                    <td>{a.improvementRate != null ? `${a.improvementRate}%` : '-'}</td>
                    <td>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Icon name="compare" size={14} />}
                        onClick={() => navigate(`?page=analysis-detail&analysisId=${a.id}`)}
                      >
                        비교 보기
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}

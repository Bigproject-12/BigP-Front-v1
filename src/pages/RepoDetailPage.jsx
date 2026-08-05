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
import FileTypeIcon from '../components/icons/FileTypeIcon';
import Select from '../components/ui/Select';
import { api } from '../lib/api'; 
import './RepoDetailPage.css';

const TOP_TABS = [
  { key: 'history', label: '히스토리' },
  { key: 'analyze', label: '코드 분석' },
  { key: 'push', label: 'Push'},
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

  // 이슈 필터 및 정렬 상태 변수
  const [issueFilter, setIssueFilter] = useState('all'); 
  const [sortBy, setSortBy] = useState('latest');

  // 👈 페이지네이션을 위한 상태 추가 (기본 1페이지, 페이지당 10개)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; 

  useEffect(() => {
    if (!repoId) return;
    api.get(`/api/repos/${repoId}/history`)
      .then(setAnalyses)
      .catch(() => setAnalyses([]));
  }, [repoId]);

  const visibleAnalyses = useMemo(() => {
    // 1. 먼저 필터링된 배열을 'filtered' 변수에 담습니다.
    let filtered = analyses.filter((a) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'done' && a.status === 'COMPLETED') ||
        (status === 'in_progress' && a.status === 'ANALYZING');
        
      const fileName = a.filePath ? a.filePath.split('/').pop() : '';
      const matchesQuery = !query.trim() || fileName.toLowerCase().includes(query.toLowerCase());
      
      const matchesIssue = issueFilter === 'all' || (issueFilter === 'has_issues' && a.issueCount > 0);
      
      return matchesStatus && matchesQuery && matchesIssue;
    });

    // 2. 만들어진 'filtered' 배열을 정렬합니다.
    filtered.sort((a, b) => {
      const timeA = new Date(a.analyzedAt || 0).getTime();
      const timeB = new Date(b.analyzedAt || 0).getTime();
      
      if (sortBy === 'oldest') {
        return timeA - timeB; // 과거 분석순 (오름차순)
      }
      return timeB - timeA; // 최신 분석순 (내림차순)
    });

    return filtered;
  }, [analyses, status, query, issueFilter, sortBy]);

  // 👈 검색어나 필터가 변경되면 무조건 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [status, query, issueFilter, sortBy]);

  // 👈 현재 페이지에 표시할 데이터만 잘라내기 (Slice)
  const totalPages = Math.ceil(visibleAnalyses.length / itemsPerPage);
  const paginatedAnalyses = visibleAnalyses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleTabChange = (key) => {
    if (key === 'analyze') {
      navigate(`/Analyze?repoId=${repoId}`);
    }
  };

  if (!repoId) {
    return <div className="ui-banner ui-banner--error">Repository를 찾을 수 없습니다.</div>;
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
            <div className="text-body-sm">히스토리를 확인하고 코드 분석 상세내용을 확인하세요.</div>
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
        
          <div style={{ width: '130px' }}>
            <Select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)}>
              <option value="all">전체 히스토리</option>
              <option value="has_issues">이슈 1건 이상</option>
            </Select>
          </div>

          <div style={{ width: '130px' }}>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="latest">최신순</option>
              <option value="oldest">과거순</option>
            </Select>
          </div>
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
              <th>개선 가능률</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedAnalyses.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="ui-empty">분석 이력이 없습니다.</div>
                </td>
              </tr>
            ) : (
              // 👈 전체 목록(visibleAnalyses) 대신 잘라낸 목록(paginatedAnalyses)을 순회합니다.
              paginatedAnalyses.map((a) => {
                const fileName = a.filePath ? a.filePath.split('/').pop() : '(파일 미지정)';
                
                const statusMap = {
                  COMPLETED: { label: '완료', variant: 'success' },
                  ANALYZING: { label: '진행중', variant: 'info' }, 
                  FAILED: { label: '실패', variant: 'warning' },
                  CANCELED: { label: '취소', variant: 'neutral' },
                };
                const st = statusMap[a.status] || { label: a.status, variant: 'neutral' };
                
                return (
                  <tr key={a.id}>
                    <td>
                      <span 
                        className="history-table__file file-link" 
                        onClick={() => navigate(`?page=analysis-detail&analysisId=${a.id}`)}
                      >
                        <FileTypeIcon name={fileName} size={15} />
                        {fileName}
                      </span>
                    </td>
                    <td>{formatDateTime(a.analyzedAt)}</td>
                    
                    <td>
                      {a.issueCount != null ? (
                        <Badge variant={a.issueCount === 0 ? 'success' : 'warning'}>
                          {a.issueCount}건
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    
                    <td>
                      {typeof a.improvableRatio === 'number'
                        ? `${a.improvableRatio.toFixed(1)}%`
                        : '-'}
                    </td>
                    <td>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td>

                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* 👈 하단 페이지네이션 UI 추가 */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px', borderTop: '1px solid var(--border-hairline)' }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              이전
            </Button>
            <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)' }}>
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              다음
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
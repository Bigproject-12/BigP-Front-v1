import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useRepos } from '../context/RepoContext';
import { formatDateTime, formatDateTimeCompact, languageColor } from '../lib/format';
import { Tabs, Segment } from '../components/ui/Tabs';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import FileTypeIcon from '../components/icons/FileTypeIcon';
import RepoSwitcher from '../components/repo/RepoSwitcher';
import Select from '../components/ui/Select';
import { api } from '../lib/api'; 
import './RepoDetailPage.css';

const TOP_TABS = [
  { key: 'history', label: '히스토리' },
  { key: 'push', label: 'Push'},
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

  // 이슈 필터 및 정렬 상태 변수
  const [issueFilter, setIssueFilter] = useState('all'); 
  const [sortBy, setSortBy] = useState('latest');

  // 👈 페이지네이션을 위한 상태 추가 (기본 1페이지, 페이지당 15개)
  // URL의 p 파라미터에서 초기값을 읽어서, 상세 페이지 갔다가 뒤로가기 해도 보던 페이지가 유지되게 한다.
  const [currentPage, setCurrentPage] = useState(() => {
    const p = Number(params.get('p'));
    return p > 0 ? p : 1;
  });
  const itemsPerPage = 15;

  const goToPage = (page) => {
    setCurrentPage(page);
    const next = new URLSearchParams(params);
    next.set('p', String(page));
    navigate(`?${next.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (!repoId) return;
    api.get(`/api/repos/${repoId}/history`)
      .then(setAnalyses)
      .catch(() => setAnalyses([]));
  }, [repoId]);

  // 상단 드롭다운으로 레포를 전환해도 이 컴포넌트는 언마운트되지 않아 필터 상태가 그대로 남는다.
  // 이전 레포의 검색어·필터·페이지가 남으면 결과가 비어 보여 혼란스러우므로 직접 초기화한다.
  const prevRepoIdRef = useRef(repoId);
  useEffect(() => {
    if (prevRepoIdRef.current === repoId) return;
    prevRepoIdRef.current = repoId;
    setStatus('all');
    setQuery('');
    setIssueFilter('all');
    setSortBy('latest');
    setCurrentPage(1);
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

  // 👈 검색어나 필터 "값"이 실제로 바뀔 때만 1페이지로 리셋 (최초 마운트 시엔 URL의 p값을 그대로 유지)
  // "처음 한 번만 건너뛰기" 플래그 방식은 React 18 StrictMode가 개발모드에서 effect를 두 번 실행할 때
  // 오작동해서(첫 실행에서 플래그가 꺼져버려 두 번째 실행에서 리셋이 실제로 발동함), 값 비교 방식으로 대체.
  const prevFiltersRef = useRef({ status, query, issueFilter, sortBy });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed =
      prev.status !== status ||
      prev.query !== query ||
      prev.issueFilter !== issueFilter ||
      prev.sortBy !== sortBy;
    prevFiltersRef.current = { status, query, issueFilter, sortBy };
    if (changed) goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      return;
    }
    if (key === 'push') {
      navigate(`?page=push-tab&repoId=${repoId}`);
      return;
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
            <RepoSwitcher repo={repo} targetPage="repo-detail" />
            <span className="text-body-sm">
              {repo ? `${repo.name} Repository의 히스토리입니다.` : ''}
            </span>
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
        <table className="history-table history-table--fixed">
          <thead>
            {/* 파일명만 남는 너비를 모두 흡수하고(--flex), 나머지 칸은 내용 너비로 고정된다.
                덕분에 화면이 좁아져도 파일명만 줄어들고 다른 칸은 뭉개지지 않는다. */}
            <tr>
              <th className="history-table__col-file">파일명</th>
              <th className="history-table__col-branch">브랜치</th>
              <th className="history-table__col-id">분석 ID</th>
              <th className="history-table__col-date">분석일시</th>
              <th className="history-table__col-issue">이슈 수</th>
              <th className="history-table__col-status">상태</th>
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
                    <td className="history-table__col-file">
                      <span
                        className="history-table__file file-link"
                        onClick={() => navigate(`?page=analysis-detail&analysisId=${a.id}`)}
                        title={a.filePath ?? undefined}
                      >
                        <FileTypeIcon name={fileName} size={15} />
                        {/* 파일명만 말줄임 처리한다. 아이콘은 잘리면 안 되므로 밖에 둔다. */}
                        <span className="history-table__file-name">{fileName}</span>
                      </span>
                    </td>
                    <td className="history-table__col-branch">{a.branch ?? '-'}</td>
                    <td className="history-table__col-id">{a.id}</td>
                    {/* 넓은 화면에선 전체 일시, 좁아지면 축약 표기로 전환한다.
                        JS 리사이즈 감지 대신 두 값을 함께 렌더하고 CSS로 하나만 보여준다.
                        리렌더 없이 즉시 전환되고, 상태도 필요 없다. */}
                    <td
                      className="history-table__date history-table__col-date"
                      title={formatDateTime(a.analyzedAt)}
                    >
                      <span className="history-table__date-full">
                        {formatDateTime(a.analyzedAt)}
                      </span>
                      <span className="history-table__date-compact">
                        {formatDateTimeCompact(a.analyzedAt)}
                      </span>
                    </td>

                    <td className="history-table__col-issue">
                      {a.issueCount != null ? (
                        <Badge variant={a.issueCount === 0 ? 'success' : 'warning'}>
                          {a.issueCount}건
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* 상태와 Push는 둘 다 배지라 한 칸으로 합쳤다.
                        컬럼이 하나 줄지만 정보 손실은 없다. Push 안 된 건은 배지를 생략한다. */}
                    <td className="history-table__col-status">
                      <span className="history-table__status">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {a.pushed && <Badge variant="success">Push됨</Badge>}
                      </span>
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
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
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
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            >
              다음
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
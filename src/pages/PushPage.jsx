import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useRepos } from '../context/RepoContext';
import { useConfirm } from '../context/ConfirmContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { Tabs } from '../components/ui/Tabs';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import FileTypeIcon from '../components/icons/FileTypeIcon';
import PrCreateModal from '../components/analysis/PrCreateModal';
import './RepoDetailPage.css';

const TOP_TABS = [
  { key: 'history', label: '히스토리' },
  { key: 'push', label: 'Push' },
  { key: 'analyze', label: '코드 분석' },
];

export default function PushPage() {
  const { params, navigate } = useRouter();
  const repoId = params.get('repoId');

  const { repos } = useRepos();
  const repo = repos.find((r) => String(r.id) === repoId) || null;
  const { confirm } = useConfirm();

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [branchFilter, setBranchFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [locallyPushedIds, setLocallyPushedIds] = useState(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushedBranch, setPushedBranch] = useState('');
  const [prUrl, setPrUrl] = useState('');

  // push된 분석들(1건이든 여러 건이든)을 그대로 보관해뒀다가, PR 생성 모달의 기본 제목/설명을 만드는 데 쓴다.
  const [pushedAnalyses, setPushedAnalyses] = useState([]);
  const [prModalOpen, setPrModalOpen] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    setLoading(true);
    api.get(`/api/repos/${repoId}/history`)
      .then(setAnalyses)
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, [repoId]);

  // 완료 + 브랜치/파일경로 있는 것만 (같은 파일이어도 분석 건마다 전부 표시)
  const eligible = useMemo(
    () => analyses.filter((a) => a.status === 'COMPLETED' && a.filePath && a.branch),
    [analyses]
  );

  // 기본 필터: push 안 된 것만
  const unpushed = useMemo(
    () => eligible.filter((a) => !a.pushed && !locallyPushedIds.has(a.id)),
    [eligible, locallyPushedIds]
  );

  const branches = useMemo(
    () => [...new Set(unpushed.map((a) => a.branch))].sort(),
    [unpushed]
  );

  const visible = useMemo(() => {
    return unpushed.filter((a) => {
      const matchesBranch = branchFilter === 'all' || a.branch === branchFilter;
      const fileName = a.filePath.split('/').pop();
      const matchesQuery = !query.trim() || fileName.toLowerCase().includes(query.toLowerCase());
      return matchesBranch && matchesQuery;
    });
  }, [unpushed, branchFilter, query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [branchFilter, query]);

  const totalPages = Math.ceil(visible.length / itemsPerPage);
  const paginatedVisible = visible.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const selectedList = visible.filter((a) => selectedIds.has(a.id));
  const lockedBranch = selectedList[0]?.branch ?? null;
  const selectedFilePaths = new Set(selectedList.map((a) => a.filePath));

  const toggleSelect = (item) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setPushedAnalyses([]);
    setPrUrl('');
  };

  const handleBatchPush = async () => {
    if (selectedList.length === 0) return;
    if (!(await confirm(
      `선택한 파일 ${selectedList.length}개를 하나의 커밋으로 GitHub(${lockedBranch})에 반영(Push)하시겠습니까?`,
      { title: '경고', danger: true }
    ))) return;

    setPushing(true);
    setPushError('');
    try {
      const ids = selectedList.map((a) => a.id);
      if (ids.length === 1) {
        // 파일 1개만 선택한 경우, 기존 단건 push 흐름(코드 분석 후 push)과 동일한 API를 태운다.
        await api.post(`/api/analysis/${ids[0]}/push`);
      } else {
        await api.post('/api/analysis/batch-push', { analysisIds: ids });
      }
      setLocallyPushedIds((prev) => new Set([...prev, ...ids]));
      setPushedAnalyses(selectedList);
      setPushedBranch(lockedBranch);
      setSelectedIds(new Set());
    } catch (e) {
      setPushError(e.message || 'Push에 실패했습니다.');
    } finally {
      setPushing(false);
    }
  };

  // PR 생성 모달의 기본 제목/설명 — 파일 1개면 해당 파일 기준, 여러 개면 개수/파일 목록 기준
  const buildPrDefaults = (analyses) => {
    if (analyses.length === 1) {
      const a = analyses[0];
      return {
        title: `GuardrAil: ${a.filePath.split('/').pop()} 코드 개선 (이슈 ${a.issueCount ?? 0}건)`,
        body:
          `분석 결과: 총 ${a.issueCount ?? 0}건의 이슈 개선.\n\n` +
          `- 파일: \`${a.filePath}\`\n\n` +
          `분석 세부 내용은 분석 ID: ${a.id}에서 확인 가능.`,
      };
    }
    const totalIssues = analyses.reduce((sum, a) => sum + (a.issueCount ?? 0), 0);
    const fileList = analyses.map((a) => `- \`${a.filePath}\``).join('\n');
    return {
      title: `GuardrAil: AI 코드 개선 (${analyses.length}개 파일)`,
      body: `분석 결과: 총 ${totalIssues}건의 이슈 개선.\n\n${fileList}`,
    };
  };

  if (!repoId) {
    return <div className="ui-banner ui-banner--error">Repository를 찾을 수 없습니다.</div>;
  }

  const handleTabChange = (key) => {
    if (key === 'history') {
      navigate(`?page=repo-detail&repoId=${repoId}`);
      return;
    }
    if (key === 'analyze') {
      navigate(`/Analyze?repoId=${repoId}`);
      return;
    }
  };

  return (
    <>
      <div className="repo-detail__head">
        <div className="repo-detail__title">
          <button
            className="ui-btn ui-btn--icon"
            onClick={() => navigate(`?page=repo-detail&repoId=${repoId}`)}
            aria-label="뒤로가기"
          >
            <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <h1 className="text-display-md">{repo ? repo.name : '불러오는 중…'}</h1>
            <span className="text-body-sm">브랜치를 선택하면 여러 파일들을 한 번에 Push 할 수 있습니다.</span>
          </div>
        </div>
      </div>

      <Tabs items={TOP_TABS} active="push" onChange={handleTabChange} />

      {loading ? (
        <div className="ui-empty">불러오는 중…</div>
      ) : (
        <>
          <div className="repo-detail__toolbar">
            <div className="repo-detail__toolbar-left">
              <div style={{ width: '160px' }}>
                <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                  <option value="all">브랜치</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
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
                  <th></th>
                  <th>파일</th>
                  <th>브랜치</th>
                  <th>분석일시</th>
                  <th>이슈 수</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="ui-empty">Push 대기 중인 분석 결과가 없습니다.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedVisible.map((a) => {
                    const fileName = a.filePath.split('/').pop();
                    const branchMismatch = lockedBranch !== null && a.branch !== lockedBranch;
                    const fileTaken = selectedFilePaths.has(a.filePath) && !selectedIds.has(a.id);
                    const disabled = branchMismatch || fileTaken;
                    return (
                      <tr key={a.id} style={disabled ? { opacity: 0.4 } : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(a.id)}
                            onChange={() => toggleSelect(a)}
                            disabled={disabled}
                            title={
                              disabled
                                ? fileTaken
                                  ? '같은 파일의 다른 분석 결과가 이미 선택되어 있습니다.'
                                  : '이미 선택한 항목과 브랜치가 달라 함께 Push할 수 없습니다.'
                                : undefined
                            }
                          />
                        </td>
                        <td>
                          <span className="history-table__file">
                            <FileTypeIcon name={fileName} size={15} />
                            {fileName}
                          </span>
                        </td>
                        <td>{a.branch}</td>
                        <td>{formatDateTime(a.analyzedAt)}</td>
                        <td>
                          {a.issueCount != null ? (
                            <Badge variant={a.issueCount === 0 ? 'success' : 'warning'}>{a.issueCount}건</Badge>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Button
              variant="primary"
              onClick={handleBatchPush}
              disabled={selectedList.length === 0 || pushing}
            >
              {pushing ? '반영 중…' : `선택한 ${selectedList.length}개 파일 Push`}
            </Button>

            {pushedAnalyses.length > 0 && (
              <Button
                variant="primary"
                onClick={() => setPrModalOpen(true)}
                disabled={!!prUrl}
              >
                {prUrl ? 'PR 생성 완료 ✓' : `PR 생성 (${pushedBranch})`}
              </Button>
            )}

            {pushError && <span className="text-body-sm ui-banner--error">{pushError}</span>}
            {prUrl && <span className="text-body-sm ui-banner--success">PR 생성에 성공했습니다.</span>}
            {!prUrl && pushedAnalyses.length > 0 && (
              <span className="text-body-sm ui-banner--success">GitHub Push에 성공했습니다.</span>
            )}
            {prUrl && (
              <a href={prUrl} target="_blank" rel="noopener noreferrer" className="text-body-sm">
                GitHub에서 PR 확인 →
              </a>
            )}
          </div>
        </>
      )}

      {prModalOpen && pushedAnalyses.length > 0 && (
        <PrCreateModal
          analysisIds={pushedAnalyses.map((a) => a.id)}
          repoId={repoId}
          headBranch={pushedBranch}
          defaultTitle={buildPrDefaults(pushedAnalyses).title}
          defaultBody={buildPrDefaults(pushedAnalyses).body}
          onClose={() => setPrModalOpen(false)}
          onCreated={(url) => {
            setPrUrl(url);
            setPrModalOpen(false);
          }}
        />
      )}
    </>
  );
}

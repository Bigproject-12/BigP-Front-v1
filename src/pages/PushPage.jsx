import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useRepos } from '../context/RepoContext';
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

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [branchFilter, setBranchFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [locallyPushedIds, setLocallyPushedIds] = useState(new Set());

  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushedBatch, setPushedBatch] = useState([]);
  const [pushedBranch, setPushedBranch] = useState('');

  const [creatingPr, setCreatingPr] = useState(false);
  const [prError, setPrError] = useState('');
  const [prUrl, setPrUrl] = useState('');

  useEffect(() => {
    if (!repoId) return;
    setLoading(true);
    api.get(`/api/repos/${repoId}/history`)
      .then(setAnalyses)
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, [repoId]);

  // 완료 + 브랜치/파일경로 있는 것만, 파일경로별로 "가장 최근 분석"만 남기기
  const latestPerFile = useMemo(() => {
    const map = new Map();
    for (const a of analyses) {
      if (a.status !== 'COMPLETED' || !a.filePath || !a.branch) continue;
      const prev = map.get(a.filePath);
      if (!prev || new Date(a.analyzedAt) > new Date(prev.analyzedAt)) {
        map.set(a.filePath, a);
      }
    }
    return [...map.values()];
  }, [analyses]);

  // 기본 필터: push 안 된 것만
  const unpushed = useMemo(
    () => latestPerFile.filter((a) => !a.pushed && !locallyPushedIds.has(a.id)),
    [latestPerFile, locallyPushedIds]
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

  const selectedList = visible.filter((a) => selectedIds.has(a.id));
  const lockedBranch = selectedList[0]?.branch ?? null;

  const toggleSelect = (item) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setPushedBatch([]);
    setPrUrl('');
  };

  const handleBatchPush = async () => {
    if (selectedList.length === 0) return;
    if (!window.confirm(
      `선택한 파일 ${selectedList.length}개를 하나의 커밋으로 GitHub(${lockedBranch})에 반영(Push)하시겠습니까?`
    )) return;

    setPushing(true);
    setPushError('');
    try {
      const ids = selectedList.map((a) => a.id);
      await api.post('/api/analysis/batch-push', { analysisIds: ids });
      setLocallyPushedIds((prev) => new Set([...prev, ...ids]));
      setPushedBatch(ids);
      setPushedBranch(lockedBranch);
      setSelectedIds(new Set());
    } catch (e) {
      setPushError(e.message || 'Push에 실패했습니다.');
    } finally {
      setPushing(false);
    }
  };

  const handleBatchPr = async () => {
    if (pushedBatch.length === 0) return;
    setCreatingPr(true);
    setPrError('');
    try {
      const { pullRequestUrl } = await api.post('/api/analysis/batch-pull-request', {
        analysisIds: pushedBatch,
      });
      setPrUrl(pullRequestUrl);
    } catch (e) {
      setPrError(e.message || 'PR 생성에 실패했습니다.');
    } finally {
      setCreatingPr(false);
    }
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
            <span className="text-body-sm">브랜치를 선택하면 여러 파일들을 한번에 Push 할 수 있습니다.</span>
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
                  visible.map((a) => {
                    const fileName = a.filePath.split('/').pop();
                    const disabled = lockedBranch !== null && a.branch !== lockedBranch && !selectedIds.has(a.id);
                    return (
                      <tr key={a.id} style={disabled ? { opacity: 0.4 } : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(a.id)}
                            onChange={() => toggleSelect(a)}
                            disabled={disabled}
                            title={disabled ? '이미 선택한 항목과 브랜치가 달라 함께 Push할 수 없습니다.' : undefined}
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
          </Card>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Button
              variant="primary"
              onClick={handleBatchPush}
              disabled={selectedList.length === 0 || pushing}
            >
              {pushing ? '반영 중…' : `선택한 ${selectedList.length}개 파일 Push`}
            </Button>

            {pushedBatch.length > 0 && (
              <Button variant="secondary" onClick={handleBatchPr} disabled={creatingPr || !!prUrl}>
                {prUrl ? 'PR 생성 완료 ✓' : creatingPr ? 'PR 생성 중…' : `PR 생성 (${pushedBranch})`}
              </Button>
            )}

            {pushError && <span className="text-body-sm ui-banner--error">{pushError}</span>}
            {prError && <span className="text-body-sm ui-banner--error">{prError}</span>}
            {prUrl && (
              <a href={prUrl} target="_blank" rel="noopener noreferrer" className="text-body-sm">
                PR 보기 →
              </a>
            )}
          </div>
        </>
      )}
    </>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../router/RouterContext';
import { useRepos } from '../context/RepoContext';
import { api } from '../lib/api';
import { fetchRepoBranches, fetchRepoTreeWithIssues } from '../lib/github';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import StatCard from '../components/ui/StatCard';
import LineChart from '../components/charts/LineChart';
import DonutChart from '../components/charts/DonutChart';
import DiffViewer from '../components/ui/DiffViewer';
import ProjectTree from '../components/myspace/ProjectTree';
import Icon from '../components/icons/Icon';
import FileTypeIcon from '../components/icons/FileTypeIcon';
import './dashboard.css';
import './RepoDetailPage.css';
import './MySpacePage.css'; // 👈 전용 CSS 파일 임포트

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function rangeEndingAt(to) {
  const from = new Date(`${to}T00:00:00`);
  from.setDate(from.getDate() - 6);
  return { from: toISODate(from), to };
}

function rateDeltaProps(rate) {
  const rounded = Math.round(rate * 10) / 10;
  if (rounded === 0) return { delta: '변화 없음', deltaDirection: 'up' };
  return {
    delta: `${rounded > 0 ? '+' : ''}${rounded}%`,
    deltaDirection: rounded >= 0 ? 'up' : 'down',
  };
}

function scoreDeltaProps(change) {
  if (change == null) return {};
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return { delta: '변화 없음', deltaDirection: 'up' };
  return {
    delta: `${rounded > 0 ? '+' : ''}${rounded}점`,
    deltaDirection: rounded >= 0 ? 'up' : 'down',
  };
}

function issueDeltaProps(change) {
  if (change == null) return {};
  if (change === 0) return { delta: '변화 없음', deltaDirection: 'up' };
  return {
    delta: `${change > 0 ? '+' : ''}${change}건`,
    deltaDirection: change < 0 ? 'up' : 'down',
  };
}

function ratioDeltaProps(change) {
  if (change == null) return {};
  const rounded = Math.round(Number(change) * 10) / 10;
  if (rounded === 0) return { delta: '변화 없음', deltaDirection: 'up' };
  return {
    delta: `${rounded > 0 ? '+' : ''}${rounded}%p`,
    deltaDirection: rounded >= 0 ? 'up' : 'down',
  };
}

const STRUCTURE_ISSUES_CARD_HEIGHT = 540;
const RISK_DONUT_CARD_HEIGHT = 360;
const AI_PR_CARD_HEIGHT = 360;

// 분석 상세(AnalysisResult.jsx CATEGORY_META)와 동일한 색상 기준: 보안=빨강, 비효율=주황, 기타=회색
const ISSUE_TYPE_LABEL = { SECURITY: '보안', INEFFICIENCY: '비효율', OTHER: '기타' };
const ISSUE_TYPE_COLOR = { SECURITY: '#E11D48', INEFFICIENCY: '#F59E0B', OTHER: '#64748B' };
const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SEVERITY_VARIANT = { CRITICAL: 'warning', HIGH: 'warning', MEDIUM: 'info', LOW: 'neutral' };
const PR_STATUS_LABEL = {
  OPEN: { label: '열림', variant: 'info' },
  MERGED: { label: '병합됨', variant: 'success' },
  CLOSED: { label: '닫힘', variant: 'neutral' },
};

export default function MySpacePage() {
  const { user } = useAuth();
  const { repos } = useRepos();
  const [repoId, setRepoId] = useState('');
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('');
  const branchSelectRef = useRef(null);

  const [range, setRange] = useState(() => rangeEndingAt(toISODate(new Date())));
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');

  const fetchOverview = () => {
    setOverviewLoading(true);
    setOverviewError('');
    api.get(`/api/my-space/overview?from=${range.from}&to=${range.to}`)
      .then(setOverview)
      .catch((e) => setOverviewError(e.message || '요약 정보를 불러오지 못했습니다.'))
      .finally(() => setOverviewLoading(false));
  };

  useEffect(fetchOverview, [range.from, range.to]);

  useEffect(() => {
    setBranch('');
    setBranches([]);
    if (!repoId) return;
    fetchRepoBranches(Number(repoId))
      .then((list) => {
        setBranches(list);
        setBranch(list.find((b) => b.isDefault)?.name || list[0]?.name || '');

        setTimeout(() => {
          if (branchSelectRef.current) {
            branchSelectRef.current.focus();
          }
        }, 100);
      })
      .catch(() => setBranches([]));
  }, [repoId]);

  return (
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          {/* GitHub 스타일의 폴더 구조 브레드크럼 레이아웃 적용 */}
          <div className="myspace-breadcrumb">
            <h1 className="text-display-md myspace-breadcrumb__title">My Space</h1>
            <span className="myspace-breadcrumb__slash">  /</span>

            {/* 1. Repository 선택 셀렉트 */}
            <div className="myspace-select-wrapper">
              <Select
                className="myspace-ghost-select"
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
              >
                <option value="">전체 Repository</option>
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>

            {/* 2. Repository 선택 시 나타나는 Branch 선택 셀렉트 (사이에 슬래시 추가) */}
            {repoId && (
              <>
                <span className="myspace-breadcrumb__slash">/</span>
                <div className="myspace-select-wrapper">
                  <Select
                    ref={branchSelectRef}
                    className="myspace-ghost-select"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={branches.length === 0}
                  >
                    {branches.length === 0 && <option value="">로딩 중...</option>}
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </Select>
                </div>
              </>
            )}
          </div>
          <span className="text-body-sm">
            {user ? `${user.name}님의 코드 품질 현황을 확인하세요.` : ''}
          </span>
        </div>

        {!repoId && (
          <div className="dashboard-controls">
            <label className="dashboard-date-range">
              <span>{range.from} ~</span>
              <input
                type="date"
                value={range.to}
                max={toISODate(new Date())}
                onChange={(e) => e.target.value && setRange(rangeEndingAt(e.target.value))}
              />
            </label>
            <Button variant="secondary" onClick={fetchOverview} disabled={overviewLoading}>
              <Icon name="refresh" size={16} />
              새로고침
            </Button>
          </div>
        )}
      </div>

      {repoId ? (
        <MySpaceRepoView repoId={Number(repoId)} branch={branch} />
      ) : (
        <MySpaceOverview overview={overview} loading={overviewLoading} error={overviewError} />
      )}
    </>
  );
}

function MySpaceOverview({ overview, loading, error }) {
  const { navigate } = useRouter();

  const qualityTrend = overview
    ? overview.qualityScoreTrend
        .filter((d) => d.averageScore != null)
        .map((d) => ({ label: d.date.slice(5), value: Math.round(d.averageScore * 10) / 10 }))
    : [];

  const issueDistribution = overview
    ? overview.issueDistribution
        .filter((d) => d.count > 0)
        .map((d) => ({ type: ISSUE_TYPE_LABEL[d.type] ?? d.type, count: d.count }))
    : [];

  return (
    <>
      {error && (
        <div className="ui-banner ui-banner--error">
          <Icon name="close" size={16} /> {error}
        </div>
      )}

      {loading && !overview ? (
        <div className="ui-empty">불러오는 중…</div>
      ) : overview && overview.repositoryCount === 0 ? (
        <div className="ui-empty">아직 연동된 Repository가 없습니다.</div>
      ) : overview ? (
        <>
          <div className="stat-grid">
            <StatCard icon="repo" label="연동 Repository" value={`${overview.repositoryCount}개`} />
            <StatCard
              icon="code"
              label="분석 건수"
              value={`${overview.totalAnalysisCount}건`}
              {...rateDeltaProps(overview.comparison.analysisChangeRate)}
            />
            <StatCard
              icon="bug"
              label="이슈 건수"
              value={`${overview.totalIssueCount}건`}
              {...rateDeltaProps(overview.comparison.issueChangeRate)}
            />
            <StatCard
              icon="score"
              label="품질 점수"
              value={`${Math.round(overview.averageQualityScore * 10) / 10}점`}
              {...scoreDeltaProps(overview.comparison.qualityScoreChange)}
            />
          </div>

          <div className="chart-grid">
            <Card className="chart-card">
              <div className="chart-card__header" style={{ padding: '2px 2px 0', display: 'flex', alignItems: 'left', gap: '8px' }}>
                <Icon name="score" size={18} />
                <h2 className="text-heading-md" style={{ margin: 0 }}>품질 점수 추이</h2>
              </div>
              {qualityTrend.length > 0 ? (
                <LineChart data={qualityTrend} valueSuffix="점" />
              ) : (
                <div className="ui-empty">기간 내 분석 이력이 없습니다.</div>
              )}
            </Card>

            <Card className="chart-card">
              <div className="chart-card__header" style={{ padding: '2px 2px 0', display: 'flex', alignItems: 'left', gap: '8px' }}>
                <Icon name="bug" size={18} />
                <h2 className="text-heading-md" style={{ margin: 0 }}>이슈 유형 분포</h2>
              </div>
              {issueDistribution.length > 0 ? (
                <DonutChart data={issueDistribution} />
              ) : (
                <div className="ui-empty">발견된 이슈가 없습니다.</div>
              )}
            </Card>
          </div>

          <Card style={{ padding: 0, marginTop: 'var(--space-lg)' }}>
            <div className="chart-card__header" style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'left', gap: '8px' }}>
              <Icon name="score" size={18} />
              <h2 className="text-heading-md" style={{ margin: 0 }}>위험 Repository TOP5</h2>
            </div>
            {overview.riskRepositories.length === 0 ? (
              <div className="ui-empty">기간 내 분석된 Repository가 없습니다.</div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Repository</th>
                    <th>품질 점수</th>
                    <th>이슈</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.riskRepositories.map((r) => (
                    <tr
                      key={r.repoId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`?page=repo-detail&repoId=${r.repoId}`)}
                    >
                      <td>{r.rank}</td>
                      <td>
                        <span className="history-table__file">
                          <Icon name="repo" size={15} />
                          {r.repoName}
                        </span>
                      </td>
                      <td>{r.qualityScore}점</td>
                      <td>{r.totalIssueCount}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="ui-empty" style={{ marginTop: 'var(--space-lg)' }}>
            자세한 내용을 보려면 위에서 Repository를 선택해주세요.
          </div>
        </>
      ) : null}
    </>
  );
}

function MySpaceRepoView({ repoId, branch }) {
  const { navigate } = useRouter();
  const [summary, setSummary] = useState(null);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topIssues, setTopIssues] = useState([]);
  const [autoPrs, setAutoPrs] = useState([]);
  const [extrasLoading, setExtrasLoading] = useState(false);

  const fetchAll = () => {
    if (!branch) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/api/my-space/repos/${repoId}/summary?branch=${encodeURIComponent(branch)}`),
      fetchRepoTreeWithIssues(repoId, branch),
    ])
      .then(([summaryData, treeData]) => {
        setSummary(summaryData);
        setTree(treeData);
      })
      .catch((e) => setError(e.message || '정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchAll, [repoId, branch]);

  const files = (tree?.items ?? []).filter((i) => i.type === 'blob');

  useEffect(() => {
    if (!tree || !branch) return;
    const targets = files
      .filter((f) => f.analyzed)
      .slice()
      .sort((a, b) => (a.qualityScore ?? 100) - (b.qualityScore ?? 100))
      .slice(0, 3);

    setExtrasLoading(true);
    Promise.all(
      targets.map((f) =>
        api
          .get(`/api/my-space/repos/${repoId}/files/analysis?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(f.path)}`)
          .catch(() => null),
      ),
    )
      .then((details) => {
        const valid = details.filter(Boolean);
        const allIssues = valid.flatMap((d) => [
          ...d.securityIssues.map((i) => ({ ...i, filePath: d.filePath, analysisId: d.analysisId })),
          ...d.inefficiencyIssues.map((i) => ({ ...i, filePath: d.filePath, analysisId: d.analysisId })),
          ...d.otherIssues.map((i) => ({ ...i, filePath: d.filePath, analysisId: d.analysisId })),
        ]);
        allIssues.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));
        setTopIssues(allIssues.slice(0, 4));
      })
      .finally(() => setExtrasLoading(false));

    api
      .get(`/api/my-space/repos/${repoId}/pull-requests?branch=${encodeURIComponent(branch)}&status=ALL&limit=20`)
      .then((prs) => setAutoPrs(prs.filter((pr) => pr.platformGenerated).slice(0, 5)))
      .catch(() => setAutoPrs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId, branch, tree]);
  const riskFiles = files
    .filter((f) => f.analyzed)
    .slice()
    .sort((a, b) => (a.qualityScore ?? 100) - (b.qualityScore ?? 100))
    .slice(0, 5);

  const repoIssueDistribution = summary
    ? [
        { type: '보안', count: summary.securityIssueCount },
        { type: '비효율', count: summary.inefficiencyIssueCount },
        { type: '기타', count: summary.otherIssueCount },
      ].filter((d) => d.count > 0)
    : [];

  return (
    <>
      <div className="dashboard-controls" style={{ justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
        <Button variant="secondary" onClick={fetchAll} disabled={loading}>
          <Icon name="refresh" size={16} />
          새로고침
        </Button>
      </div>

      {error && (
        <div className="ui-banner ui-banner--error">
          <Icon name="close" size={16} /> {error}
        </div>
      )}

      {loading && !summary ? (
        <div className="ui-empty">불러오는 중…</div>
      ) : summary && summary.analysisId == null ? (
        <div className="ui-empty">이 브랜치에는 아직 분석 이력이 없습니다.</div>
      ) : summary ? (
        <>
          <div className="stat-grid">
            <StatCard
              icon="score"
              label="품질 점수"
              value={`${Math.round(summary.qualityScore * 10) / 10}점`}
              {...scoreDeltaProps(summary.comparison.qualityScoreChange)}
            />
            <StatCard
              icon="code"
              label="분석 건수"
              value={`${summary.totalAnalysisCount}건`}
            />
            <StatCard
              icon="bug"
              label="이슈 수"
              value={`${summary.totalIssueCount}건`}
              {...issueDeltaProps(summary.comparison.totalIssueChange)}
            />
            <StatCard
              icon="arrowUp"
              label="개선 가능률"
              value={summary.improvableRatio != null ? `${summary.improvableRatio}%` : '-'}
              {...ratioDeltaProps(summary.comparison.improvableRatioChange)}
            />
          </div>

          <div className="recent-grid" style={{ marginTop: 'var(--space-lg)', gridTemplateColumns: '1fr 0.7fr' }}>
            <Card style={{ padding: 0, height: RISK_DONUT_CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}>
              <div className="chart-card__header" style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'left', gap: '8px', flex: 'none' }}>
                <Icon name="score" size={18} />
                <h2 className="text-heading-md" style={{ margin: 0 }}>파일 별 위험도 TOP5</h2>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>파일</th>
                      <th>품질 점수</th>
                      <th>이슈</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }, (_, idx) => riskFiles[idx]).map((f, idx) => (
                      <tr key={f?.path ?? `empty-${idx}`}>
                        <td>{f ? idx + 1 : ''}</td>
                        <td>
                          {f ? (
                            <span className="history-table__file">
                              <FileTypeIcon name={f.path} size={15} />
                              {f.path}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>{f ? `${f.qualityScore}점` : '-'}</td>
                        <td>{f ? `${f.totalIssueCount}건` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="chart-card" style={{ height: RISK_DONUT_CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}>
              <div className="chart-card__header" style={{ padding: '2px 2px 0', display: 'flex', alignItems: 'left', gap: '8px', flex: 'none' }}>
                <Icon name="bug" size={18} />
                <h2 className="text-heading-md" style={{ margin: 0 }}>이슈 유형 분포</h2>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
                {repoIssueDistribution.length > 0 ? (
                  <DonutChart data={repoIssueDistribution} />
                ) : (
                  <div className="ui-empty">발견된 이슈가 없습니다.</div>
                )}
              </div>
            </Card>
          </div>

          <div className="recent-grid" style={{ marginTop: 'var(--space-lg)', gridTemplateColumns: '0.8fr 1.2fr', alignItems: 'start' }}>
            <Card style={{ padding: 0, height: STRUCTURE_ISSUES_CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}>
              <div className="chart-card__header" style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'left', gap: '8px', flex: 'none' }}>
                <Icon name="folder" size={18} />
                <h2 className="text-heading-md" style={{ margin: 0 }}>프로젝트 구조</h2>
              </div>
              <div style={{ padding: '8px 8px 16px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <ProjectTree files={files} />
              </div>
            </Card>

            <Card style={{ padding: 0, height: STRUCTURE_ISSUES_CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}>
                <div className="chart-card__header" style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'left', gap: '8px', flex: 'none' }}>
                  <Icon name="bug" size={18} />
                  <h2 className="text-heading-md" style={{ margin: 0 }}>우선 해결해야 할 이슈</h2>
                </div>
                {extrasLoading ? (
                  <div className="ui-empty">불러오는 중…</div>
                ) : topIssues.length === 0 ? (
                  <div className="ui-empty">발견된 이슈가 없습니다.</div>
                ) : (
                  <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {topIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 12px',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
                          <Badge
                            variant="neutral"
                            style={{
                              alignSelf: 'flex-start',
                              color: ISSUE_TYPE_COLOR[issue.type] ?? '#64748B',
                              background: `${ISSUE_TYPE_COLOR[issue.type] ?? '#64748B'}22`,
                            }}
                          >
                            {ISSUE_TYPE_LABEL[issue.type] ?? issue.type}
                          </Badge>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <Badge variant={SEVERITY_VARIANT[issue.severity] ?? 'neutral'} style={{ alignSelf: 'flex-start', flex: 'none' }}>
                              {issue.severity}
                            </Badge>
                            <span
                              className="text-body-sm"
                              style={{
                                fontWeight: 600,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {issue.description || issue.suggestion || '이슈'}
                            </span>
                          </div>
                          <span
                            className="text-caption-md"
                            style={{
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {issue.filePath}{issue.line ? ` : ${issue.line}줄` : ''}
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`?page=analysis-detail&analysisId=${issue.analysisId}`)}
                        >
                          상세보기
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
          </div>

          <div className="recent-grid" style={{ marginTop: 'var(--space-lg)' }}>
                <Card style={{ padding: 0, height: AI_PR_CARD_HEIGHT, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <div className="chart-card__header" style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'left', gap: '8px', flex: 'none' }}>
                    <Icon name="spark" size={18} />
                    <h2 className="text-heading-md" style={{ margin: 0 }}>Ai 리팩토링 제안</h2>
                  </div>
                  {summary && summary.modifiedCode && summary.modifiedCode !== summary.originCode && (
                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ position: 'absolute', top: 14, right: 16 }}
                      onClick={() => navigate(`?page=analysis-detail&analysisId=${summary.analysisId}`)}
                    >
                      상세보기
                    </Button>
                  )}
                  {loading ? (
                    <div className="ui-empty">불러오는 중…</div>
                  ) : !summary || !summary.modifiedCode || summary.modifiedCode === summary.originCode ? (
                    <div className="ui-empty">제안할 개선 코드가 없습니다.</div>
                  ) : (
                    <>
                      <div style={{ padding: '0 16px 8px' }}>
                        <span className="text-caption-md" style={{ color: 'var(--text-muted)' }}>{summary.filePath}</span>
                      </div>
                      <div style={{ padding: '0 16px 16px' }}>
                        <div className="diff-card" style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', maxHeight: 270, overflowY: 'auto' }}>
                          <DiffViewer original={summary.originCode} improved={summary.modifiedCode} />
                        </div>
                      </div>
                    </>
                  )}
                </Card>

                <Card style={{ padding: 0, height: AI_PR_CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-card__header" style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'left', gap: '8px', flex: 'none' }}>
                    <Icon name="pullrequest" size={18} />
                    <h2 className="text-heading-md" style={{ margin: 0 }}>최근 생성 PR TOP5</h2>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: 28 }}>제목</th>
                          <th>브랜치</th>
                          <th>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 5 }, (_, idx) => autoPrs[idx]).map((pr, idx) => {
                          const st = pr ? (PR_STATUS_LABEL[pr.status] ?? { label: pr.status, variant: 'neutral' }) : null;
                          return (
                            <tr
                              key={pr?.githubPrNumber ?? `empty-${idx}`}
                              style={pr ? { cursor: 'pointer' } : undefined}
                              onClick={pr ? () => window.open(pr.prUrl, '_blank', 'noopener,noreferrer') : undefined}
                            >
                              <td>
                                {pr ? (
                                  <span className="history-table__file">
                                    <Icon name="pr" size={15} />
                                    {pr.title.replace(/^GuardrAil:\s*/, '')}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                                )}
                              </td>
                              <td>
                                {pr ? (
                                  <span style={{ fontSize: 'var(--fs-caption-md)', color: 'var(--text-muted)' }}>
                                    {pr.headBranch} → {pr.baseBranch}
                                  </span>
                                ) : '-'}
                              </td>
                              <td>{st ? <Badge variant={st.variant}>{st.label}</Badge> : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
        </>
      ) : null}
    </>
  );
}
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LineChart from '../components/charts/LineChart';
import DonutChart from '../components/charts/DonutChart';
import Icon from '../components/icons/Icon';
import './DashboardPage.css';
import './RepoDetailPage.css';

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 조회 기간은 항상 7일 고정 — 기준일(to)만 고르면 from은 자동으로 6일 전으로 계산된다.
function rangeEndingAt(to) {
  const from = new Date(`${to}T00:00:00`);
  from.setDate(from.getDate() - 6);
  return { from: toISODate(from), to };
}

const ISSUE_TYPE_LABEL = { SECURITY: '보안', INEFFICIENCY: '비효율', OTHER: '코드 중복성' };
const STATUS_LABEL = {
  COMPLETED: { label: '완료', variant: 'success' },
  ANALYZING: { label: '분석중', variant: 'info' },
  FAILED: { label: '실패', variant: 'warning' },
  CANCELED: { label: '취소', variant: 'neutral' },
};
const PR_STATUS_LABEL = {
  OPEN: { label: '열림', variant: 'info' },
  MERGED: { label: '병합됨', variant: 'success' },
  CLOSED: { label: '닫힘', variant: 'neutral' },
};

function deltaProps(rate) {
  const rounded = Math.round(rate * 10) / 10;
  if (rounded === 0) return { delta: '변화 없음', deltaDirection: 'up' };
  return {
    delta: `${rounded > 0 ? '+' : ''}${rounded}%`,
    deltaDirection: rounded >= 0 ? 'up' : 'down',
  };
}

export default function DashboardPage() {
  const [range, setRange] = useState(() => rangeEndingAt(toISODate(new Date())));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = () => {
    setLoading(true);
    setError('');
    api.get(`/api/dashboard?from=${range.from}&to=${range.to}`)
      .then(setData)
      .catch((e) => setError(e.message || '대시보드 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchDashboard, [range.from, range.to]);

  const header = (
    <div className="gr-page__header">
      <div className="gr-page__header-text">
        <h1 className="text-display-md">HOME</h1>
        <span className="text-body-sm">전체 프로젝트의 코드 품질 현황을 확인하세요.</span>
      </div>
      <div className="dashboard-controls">
        <label className="dashboard-date-range">
          {/*<Icon name="calendar" size={16} />*/}
          <span>{range.from} ~</span>
          <input
            type="date"
            value={range.to}
            max={toISODate(new Date())}
            onChange={(e) => e.target.value && setRange(rangeEndingAt(e.target.value))}
          />
        </label>
        <Button variant="secondary" onClick={fetchDashboard} disabled={loading}>
          <Icon name="refresh" size={16} />
          
        </Button>
      </div>
    </div>
  );

  if (loading && !data) {
    return (
      <>
        {header}
        <div className="ui-empty">불러오는 중…</div>
      </>
    );
  }
  if (error) {
    return (
      <>
        {header}
        <div className="ui-banner ui-banner--error">
          <Icon name="close" size={16} /> {error}
        </div>
      </>
    );
  }
  if (!data) return null;

  const qualityTrend = data.qualityScoreTrend
    .filter((d) => d.averageScore != null)
    .map((d) => ({ label: d.date.slice(5), value: Math.round(d.averageScore * 10) / 10 }));

  const issueDistribution = data.issueDistribution
    .filter((d) => d.count > 0)
    .map((d) => ({ type: ISSUE_TYPE_LABEL[d.type] ?? d.type, count: d.count }));

  const qualityScore = Math.round(data.averageQualityScore * 10) / 10;
  const qualityChange = Math.round(data.comparison.qualityScoreChange * 10) / 10;

  // 타이틀 문자열에서 파일명과 이슈 건수를 추출하는 함수
const parsePrTitle = (title) => {
  if (!title) return { fileName: '', issueText: '' };

  // 예: "GuardrAil: JavaTestCode.java 코드 개선 (이슈 2건)"
  // 정규식으로 파일명(파일명.확장자 형태)과 (이슈 X건) 부분을 추출합니다.
  const fileMatch = title.match(/:\s*(.*?)\s*코드 개선/);
  const issueMatch = title.match(/\(이슈\s*\d+건\)/);

  return {
    fileName: fileMatch ? fileMatch[1] : title, // 추출 실패 시 원본 타이틀 반환
    issueText: issueMatch ? issueMatch[0] : '',  // 예: "(이슈 2건)"
  };
};

  return (
    <>
      {header}

      <div className="stat-grid">

        
        <StatCard icon="repo" 
          label="연동 레포지토리" 
          value={`${data.repositoryCount}개`} 
        />
        <StatCard
          icon="code"
          label="전체 분석 건수"
          value={`${data.totalAnalysisCount}건`}
          {...deltaProps(data.comparison.analysisChangeRate)}
        />
        <StatCard
          icon="bug"
          label="전체 이슈 건수"
          value={`${data.totalIssueCount}건`}
          {...deltaProps(data.comparison.issueChangeRate)}
        />
        <StatCard
          icon="score"
          label="평균 품질 점수"
          value={`${qualityScore}점`}
          delta={`${qualityChange > 0 ? '+' : ''}${qualityChange}점`}
          deltaDirection={qualityChange >= 0 ? 'up' : 'down'}
        />
      </div>

      <div className="status-chip-row">
        <Badge variant="info">분석중 {data.analyzingCount}</Badge>
        <Badge variant="success">완료 {data.completedCount}</Badge>
        <Badge variant="warning">실패 {data.failedCount}</Badge>
        <Badge variant="neutral">취소 {data.canceledCount}</Badge>
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

      <div className="recent-grid recent-grid--tables">
        <Card style={{ padding: 0 }}>
          <div className="chart-card__header" style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'left', gap: '8px' }}>
            <Icon name="code" size={18} />
            <h2 className="text-heading-md" style={{ margin: 0 }}>최근 분석</h2>
          </div>
          <div>
            {data.recentAnalyses.length === 0 ? (
              <div className="ui-empty">최근 분석 이력이 없습니다.</div>
            ) : (
              <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>확장자</th>
                    <th>상태</th>
                    <th>이슈</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 👈 최대 7개까지만 출력 */}
                  {data.recentAnalyses.slice(0, 7).map((a) => {
                    const st = STATUS_LABEL[a.status] ?? { label: a.status, variant: 'neutral' };
                    return (
                      <tr key={a.analysisId}>
                        <td>
                          <span className="history-table__file">
                            <Icon name="repo" size={15} />
                            {/* 좁아졌을 때 여러 줄로 접히지 않고 …로 잘리도록 텍스트를 감싼다 */}
                            <span className="history-table__file-name">{a.repoName}</span>
                          </span>
                        </td>
                        <td>{a.language}</td>
                        <td>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>
                        <td>{a.totalIssueCount}건</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card style={{ padding: 0 }}>
          <div className="chart-card__header" style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'left', gap: '8px' }}>
            <Icon name="pullrequest" size={18} />
            <h2 className="text-heading-md" style={{ margin: 0 }}>최근 PR</h2>
          </div>
          {data.recentPullRequests.length === 0 ? (
            <div className="ui-empty">최근 생성된 PR이 없습니다.</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>파일명</th>
                  <th>브랜치</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPullRequests.map((pr) => {
                  const st = PR_STATUS_LABEL[pr.status] ?? { label: pr.status, variant: 'neutral' };
                  const {fileName,issueText}=parsePrTitle(pr.title);
                  return (
                    <tr
                      key={pr.pullRequestId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => window.open(pr.prUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <td>
                        <span className="history-table__file">
                          <Icon name="repo" size={15} />
                          {/* 좁아졌을 때 여러 줄로 접히지 않고 …로 잘리도록 텍스트를 감싼다 */}
                          <span className="history-table__file-name">{pr.repoName}</span>
                        </span>
                      </td>
                      <td>
                        {/* 원하는 조합과 볼드체 적용 */}
                        {/*
                        <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>
                          #{pr.githubPrNumber}
                        </span>
                        */}
                        <span style={{ fontSize: 'var(--fs-caption-md)', color: 'var(--text-muted)' }}>
                        {fileName}
                        </span>

                      </td>
                      <td>
                        <span style={{ fontSize: 'var(--fs-caption-md)', color: 'var(--text-muted)' }}>
                          {pr.baseBranch} ← {pr.headBranch}
                        </span>
                      </td>
                      <td>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

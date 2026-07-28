import { useEffect, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import DiffViewer from '../components/ui/DiffViewer';
import './AnalyzePage.css';
import './RepoDetailPage.css';

const TYPE_VARIANT = { 보안: 'warning', 비효율: 'info', 이슈: 'neutral' };

function parseJsonArray(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getConfidenceLevel(probability) {
  if (probability >= 70) return 'high';
  if (probability >= 40) return 'medium';
  return 'low';
}

export default function AnalysisDetailPage() {
  const { params } = useRouter();
  const analysisId = params.get('analysisId');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushed, setPushed] = useState(false);
  
  // 탭 상태 추가: 'result' (분석 결과) 또는 'code' (코드 비교)
  const [activeTab, setActiveTab] = useState('result');

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    const load = async () => {
      const result = await api.get(`/api/analysis/${analysisId}`);
      if (cancelled) return;
      if (result.status === 'ANALYZING') {
        setTimeout(load, 2500);
        return;
      }
      setData(result);
      setLoading(false);
    };

    load().catch((e) => {
      if (cancelled) return;
      setError(e.message || '분석 결과를 불러오지 못했습니다.');
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [analysisId]);

  const handlePush = async () => {
    setPushing(true);
    setPushError('');
    try {
        await api.post(`/api/analysis/${analysisId}/push`);
        setPushed(true);
    }   catch (e) {
        setPushError(e.message || 'GitHub에 반영하지 못했습니다.');
    }   finally {
        setPushing(false);
    }
  };

  if (!analysisId) {
    return <div className="ui-banner ui-banner--error">분석 ID가 없습니다.</div>;
  }
  if (loading) {
    return <div className="ui-empty">분석 결과를 불러오는 중…</div>;
  }
  if (error) {
    return (
      <div className="ui-banner ui-banner--error">
        <Icon name="close" size={16} /> {error}
      </div>
    );
  }
  if (!data) return null;

  const vulnerabilities = parseJsonArray(data.secuResult);
  const complexityDetails = parseJsonArray(data.inefficiencyResult);
  const issues = [
    ...vulnerabilities.map((v) => ({
      type: '보안',
      severity: 'high',
      description: `${v.line}번째 줄 — ${v.message}`,
      reason: v.rule_id,
    })),
    ...complexityDetails.map((c) => ({
      type: '비효율',
      severity: 'low',
      description: `${c.function_name} 함수 (복잡도 ${c.complexity_score})`,
      reason: c.message,
    })),
  ];
  const fileName = data.filePath ? data.filePath.split('/').pop() : '(파일 미지정)';

  return (
    <>
      <div className="repo-detail__head">
        <div className="repo-detail__title">
            <button className="ui-btn ui-btn--icon" onClick={() => window.history.back()} aria-label="뒤로가기">
                <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div>
                <h1 className="text-display-md">분석 결과</h1>
                <span className="text-body-sm">분석 #{data.analysisId}</span>
            </div>
        </div>
      </div>

      <Card>
        <div className="analyze-toolbar">
          <div className="analyze-toolbar__field">
            <label>Repository</label>
            <div className="text-body-md">{data.repoName ?? '-'}</div>
          </div>
          <div className="analyze-toolbar__field">
            <label>파일</label>
            <div className="text-body-md">{fileName}</div>
          </div>
          <div className="analyze-toolbar__field" style={{ maxWidth: '140px' }}>
            <label>확장자</label>
            <div className="text-body-md">{data.language ?? '-'}</div>
          </div>
        </div>
      </Card>

      {data.status === 'FAILED' && (
        <div className="ui-banner ui-banner--error">
          <Icon name="close" size={16} /> 분석에 실패했습니다.
        </div>
      )}
      {data.status === 'CANCELED' && (
        <div className="ui-banner ui-banner--error">
          <Icon name="close" size={16} /> 취소된 분석입니다.
        </div>
      )}

      {data.status === 'COMPLETED' && (
        <>
          <div className="analyze-toolbar" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', marginBottom: '16px' }}>
            
            {/* 탭 네비게이션 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`ui-btn ${activeTab === 'result' ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
                onClick={() => setActiveTab('result')}
              >
                분석 결과 및 설명
              </button>
              <button
                className={`ui-btn ${activeTab === 'code' ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
                onClick={() => setActiveTab('code')}
              >
                원본 / 개선 코드 비교
              </button>
            </div>

            {/* GitHub 반영 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {pushError && <span className="text-body-sm ui-banner--error" style={{ margin: 0, padding: '4px 8px' }}>{pushError}</span>}
              <button
                  className="ui-btn ui-btn--primary ui-btn--md"
                  onClick={handlePush}
                  disabled={pushing || pushed}
              >
                  {pushed ? '반영 완료 ✓' : pushing ? '반영 중…' : 'GitHub에 Push'}
              </button>
            </div>
          </div>

          {/* 탭 1: 분석 결과 및 설명 영역 */}
          {activeTab === 'result' && (
            <div className="result-section">
              <div className="gr-page__header" style={{ marginBottom: '16px' }}>
                <span className="text-body-sm">총 {data.totalIssues ?? 0}건의 이슈가 발견되었습니다.</span>
              </div>
              <div className="result-grid">
                {issues.map((issue, i) => (
                  <Card key={i} className="result-card">
                    <div className="result-card__head">
                      <span className={`result-card__severity result-card__severity--${issue.severity}`} />
                      <Badge variant={TYPE_VARIANT[issue.type] || 'neutral'}>{issue.type}</Badge>
                    </div>
                    <p className="text-body-sm">{issue.description}</p>
                    <p className="text-caption-md result-card__reason">
                      <strong>개선 사유</strong><br />{issue.reason}
                    </p>
                  </Card>
                ))}

                {data.aiProbability != null && (
                  <Card className="result-card">
                    <div className="result-card__head">
                      <Icon name={data.aiGenerated ? 'spark' : 'check'} size={15} />
                      <span className={`confidence-pill confidence-pill--${getConfidenceLevel(data.aiProbability)}`}>
                        {Math.round(data.aiProbability)}%
                      </span>
                    </div>
                    <p className="text-body-sm">
                      {data.aiGenerated ? 'AI 생성 코드로 판별됨' : '사람이 작성한 코드로 판별됨'}
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* 탭 2: 코드 뷰어 영역 */}
          {activeTab === 'code' && (
            <Card className="diff-card">
              <DiffViewer original={data.originCode} improved={data.modifiedCode || data.originCode} />
            </Card>
          )}
        </>
      )}
    </>
  );
}
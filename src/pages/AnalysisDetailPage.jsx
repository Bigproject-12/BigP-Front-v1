import { useEffect, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { api } from '../lib/api';
// 프롬프트 추천 함수 및 버튼 컴포넌트 추가
import { recommendPrompt } from '../lib/aiService';
import Button from '../components/ui/Button';
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
  
  const [activeTab, setActiveTab] = useState('result');
  const [isDiffExpanded, setIsDiffExpanded] = useState(false);
  const [targetSearch, setTargetSearch] = useState({ type: null, value: null });

  // --- 프롬프트 추천을 위한 상태 추가 ---
  const [userPrompt, setUserPrompt] = useState('');
  const [recommending, setRecommending] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [promptResult, setPromptResult] = useState(null);
  const [promptTab, setPromptTab] = useState('improve');
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptElapsed, setPromptElapsed] = useState(null);
  // -------------------------------------

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

  useEffect(() => {
    if (activeTab === 'code' && targetSearch.type) {
      const timer = setTimeout(() => {
        const elements = document.querySelectorAll('.diff-card td, .diff-card span, .diff-card div');
        
        for (let el of elements) {
          let match = false;
          
          if (targetSearch.type === 'line' && el.textContent.trim() === String(targetSearch.value)) {
            match = true;
          } else if (targetSearch.type === 'function' && el.textContent.includes(targetSearch.value)) {
            match = true;
          }

          if (match) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const highlightTarget = el.closest('tr') || el;
            const originalBg = highlightTarget.style.backgroundColor;
            
            highlightTarget.style.backgroundColor = '#fff3cd'; 
            setTimeout(() => { highlightTarget.style.backgroundColor = originalBg; }, 2000); 
            break;
          }
        }
        
        setTargetSearch({ type: null, value: null });
      }, 100); 
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, targetSearch]);

  const handlePush = async () => {
    if (!window.confirm('개선된 코드를 GitHub에 반영(push)하시겠습니까? 실제 저장소의 파일이 수정됩니다.')) return;
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

  // --- 프롬프트 추천 핸들러 함수 ---
  const handleRecommendPrompt = async () => {
    if (!data || !data.originCode) return;
    setRecommending(true);
    setPromptError('');
    setPromptResult(null);
    setPromptCopied(false);
    setPromptElapsed(null);
    try {
      const { result, elapsedMs } = await recommendPrompt(data.originCode, userPrompt);
      setPromptResult(result);
      setPromptElapsed(elapsedMs);
    } catch (e) {
      setPromptError(e.message || '프롬프트 추천 중 오류가 발생했습니다.');
    } finally {
      setRecommending(false);
    }
  };

  const handleCopyPrompt = () => {
    const text = promptResult?.[promptTab]?.prompt ?? '';
    navigator.clipboard.writeText(text).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };
  // ---------------------------------

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
      line: v.line, 
    })),
    ...complexityDetails.map((c) => ({
      type: '비효율',
      severity: 'low',
      description: `${c.function_name} 함수 (복잡도 ${c.complexity_score})`,
      reason: c.message,
      functionName: c.function_name, 
    })),
  ];

  const pathParts = data.filePath ? data.filePath.split('/') : [];

  const handleIssueClick = (issue) => {
    if (issue.line) {
      setTargetSearch({ type: 'line', value: issue.line });
      setActiveTab('code');
    } else if (issue.functionName) {
      setTargetSearch({ type: 'function', value: issue.functionName });
      setActiveTab('code');
    }
  };

  return (
    <>
      <div className="repo-detail__head">
        <div className="repo-detail__title">
            <button className="ui-btn ui-btn--icon" onClick={() => window.history.back()} aria-label="뒤로가기">
                <Icon name="chevronRight" size={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div>
                <h1 className="text-display-md">분석 결과</h1>
                <span className="text-body-sm">분석 ID: {data.analysisId}</span>
            </div>
        </div>
      </div>

      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '18px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--link)', fontWeight: '500' }}>{data.repoName ?? 'Unknown'}</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>

          {pathParts.length > 0 ? (
            pathParts.map((part, index) => (
              <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  color: index === pathParts.length - 1 ? 'var(--text-primary)' : 'var(--link)',
                  fontWeight: index === pathParts.length - 1 ? '600' : 'normal'
                }}>
                  {part}
                </span>
                {index < pathParts.length - 1 && <span style={{ color: 'var(--text-muted)' }}>/</span>}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>(파일 미지정)</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--surface-soft)',
            padding: '4px 10px',
            borderRadius: '2em',
            border: '1px solid var(--border-hairline-strong)',
            fontWeight: '500'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Branch:</span>
            <span style={{ color: 'var(--text-primary)' }}>{data.branch ?? 'main'}</span>
          </div>
          <span>•</span>
          <span>확장자: <strong>{data.language ?? '-'}</strong></span>
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
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`ui-btn detail-tab-btn ${activeTab === 'result' ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
                onClick={() => setActiveTab('result')}
              >
                분석 결과 및 설명
              </button>
              <button
                className={`ui-btn detail-tab-btn ${activeTab === 'code' ? 'ui-btn--primary' : 'ui-btn--ghost'}`}
                onClick={() => setActiveTab('code')}
              >
                원본 / 개선 코드 비교
              </button>
            </div>

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

          {activeTab === 'result' && (
            <div className="result-section result-section--detail">
              
              {data.aiProbability != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  {/* AI 판별 상태 배너 */}
                  <Card 
                    className={`ai-banner ${data.aiProbability >= 50 ? 'ai-banner--ai' : 'ai-banner--human'}`}
                    style={{ padding: '20px' }}
                  >
                    <div className="ai-banner__content" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="ai-banner__icon-wrapper">
                        <Icon 
                          name={data.aiGenerated ? 'spark' : 'user'} 
                          size={24} 
                          className="ai-banner__icon" 
                        />
                      </div>
                      <div>
                        <h3 className="ai-banner__title" style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '700' }}>
                          {data.aiGenerated ? 'AI 생성 코드로 판별됨' : '인간이 작성한 코드로 판별됨'}
                        </h3>
                        <p className="ai-banner__desc" style={{ margin: 0, fontSize: '14px' }}>
                          AI 작성 확률: <strong>{Math.round(data.aiProbability)}%</strong> <br/>
                          {data.aiGenerated 
                            ? 'AI가 작성한 코드는 예상치 못한 논리적 오류나 취약점이 포함될 수 있으므로 아래 분석 결과를 주의 깊게 검토하세요.' 
                            : '사람이 작성한 코드입니다. 식별된 보안 및 비효율 이슈를 확인해 보세요.'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* AI 생성 코드일 경우 프롬프트 추천 UI 노출 */}
                  {data.aiGenerated && (
                    <Card className="prompt-section" style={{ backgroundColor: 'var(--surface-default)' }}>
                      <div className="prompt-section__header" style={{ marginBottom: '12px' }}>
                        <Icon name="edit" size={16} />
                        <h3 className="text-heading-md" style={{ margin: 0, marginLeft: '8px' }}>더 나은 프롬프트 추천</h3>
                      </div>
                      <p className="prompt-section__desc text-body-sm" style={{ marginBottom: '16px' }}>
                        원하는 방향을 입력하면 맞춤 프롬프트를 추천해드립니다. 비워두면 AI가 코드를 보고 자동으로 작성합니다.
                      </p>
                      <div className="prompt-section__input-row">
                        <textarea
                          className="prompt-section__textarea"
                          placeholder="예: 성능 최적화에 집중해줘 / 보안 취약점을 제거해줘 / 가독성을 높여줘"
                          value={userPrompt}
                          onChange={(e) => setUserPrompt(e.target.value)}
                          rows={2}
                        />
                        <Button variant="primary" onClick={handleRecommendPrompt} disabled={recommending}>
                          {recommending ? '추천 중…' : '프롬프트 추천받기'}
                        </Button>
                      </div>

                      {promptError && <div className="ui-banner ui-banner--error">{promptError}</div>}

                      {promptResult && (
                        <div className="prompt-result" style={{ marginTop: '16px' }}>
                          <div className="prompt-result__tabs">
                            <button
                              className={`prompt-result__tab ${promptTab === 'improve' ? 'prompt-result__tab--active' : ''}`}
                              onClick={() => { setPromptTab('improve'); setPromptCopied(false); }}
                            >
                              <Icon name="edit" size={14} /> 코드 개선 프롬프트
                            </button>
                            <button
                              className={`prompt-result__tab ${promptTab === 'generate' ? 'prompt-result__tab--active' : ''}`}
                              onClick={() => { setPromptTab('generate'); setPromptCopied(false); }}
                            >
                              <Icon name="spark" size={14} /> 신규 생성 프롬프트
                            </button>
                            {promptElapsed !== null && (
                              <span className="ai-elapsed ai-elapsed--right text-caption-md">
                                <Icon name="spark" size={12} /> {promptElapsed >= 1000 ? `${(promptElapsed / 1000).toFixed(2)}s` : `${promptElapsed}ms`}
                              </span>
                            )}
                          </div>
                          <div className="prompt-result__body">
                            <div className="prompt-result__header">
                              <span className="text-caption-md prompt-result__label">
                                {promptTab === 'improve' ? '기존 코드를 AI에게 개선 요청할 때 사용하세요.' : '같은 기능을 AI에게 처음부터 생성 요청할 때 사용하세요.'}
                              </span>
                              <Button variant="ghost" size="sm" icon={<Icon name={promptCopied ? 'check' : 'upload'} size={14} />} onClick={handleCopyPrompt}>
                                {promptCopied ? '복사됨' : '복사'}
                              </Button>
                            </div>
                            <pre className="prompt-result__text">{promptResult[promptTab].prompt}</pre>
                            <p className="text-caption-md prompt-result__explanation">
                              <strong>추천 이유</strong><br />{promptResult[promptTab].explanation}
                            </p>
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              )}

              <div className="gr-page__header" style={{ marginBottom: '24px' }}>
                <h2 className="text-heading-lg" style={{ margin: 0 }}>상세 분석 리포트</h2>
                <span className="text-body-sm" style={{ color: '#57606a' }}>
                  총 {data.totalIssues ?? 0}건의 이슈가 발견되었습니다.
                </span>
              </div>

              {vulnerabilities && vulnerabilities.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#cf222e' }}></span>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>보안 취약점 ({vulnerabilities.length}건)</h3>
                  </div>
                  <div className="result-grid">
                    {vulnerabilities.map((v, i) => (
                      <Card 
                        key={`sec-${i}`} 
                        className="result-card" 
                        onClick={() => handleIssueClick({ line: v.line })}
                        style={{ cursor: 'pointer', borderLeft: '4px solid #cf222e' }}
                      >
                        <div className="result-card__head">
                          <span className="result-card__severity result-card__severity--high" />
                          <Badge variant="warning">보안</Badge>
                        </div>
                        <p className="text-body-sm">{v.line}번째 줄 — {v.message}</p>
                        <p className="text-caption-md result-card__reason">
                          <strong>관련 규칙:</strong><br />{v.rule_id}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {complexityDetails && complexityDetails.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0969da' }}></span>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>코드 비효율 ({complexityDetails.length}건)</h3>
                  </div>
                  <div className="result-grid">
                    {complexityDetails.map((c, i) => (
                      <Card 
                        key={`ineff-${i}`} 
                        className="result-card" 
                        onClick={() => handleIssueClick({ functionName: c.function_name })}
                        style={{ cursor: 'pointer', borderLeft: '4px solid #0969da' }}
                      >
                        <div className="result-card__head">
                          <span className="result-card__severity result-card__severity--low" />
                          <Badge variant="info">비효율</Badge>
                        </div>
                        <p className="text-body-sm">{c.function_name} 함수 (복잡도 {c.complexity_score})</p>
                        <p className="text-caption-md result-card__reason">
                          <strong>개선 사유:</strong><br />{c.message}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {(!vulnerabilities?.length && !complexityDetails?.length) && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#57606a', backgroundColor: 'var(--surface-soft)', borderRadius: '6px' }}>
                  발견된 보안 취약점이나 비효율 요소가 없습니다.
                </div>
              )}

            </div>
          )}

          {activeTab === 'code' && (
            <>
              <div className="diff-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 className="text-heading-lg">원본 / 개선 코드 비교</h2>
                <button 
                  className="ui-btn ui-btn--outline ui-btn--sm"
                  onClick={() => setIsDiffExpanded(!isDiffExpanded)}
                >
                  {isDiffExpanded ? '스크롤 모드로 보기' : '전체 보기'}
                </button>
              </div>

              <Card 
                className="diff-card" 
                style={{ 
                  maxHeight: isDiffExpanded ? 'none' : '800px', 
                  overflowY: isDiffExpanded ? 'visible' : 'auto' 
                }}
              >
                <DiffViewer original={data.originCode} improved={data.modifiedCode || data.originCode} />
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
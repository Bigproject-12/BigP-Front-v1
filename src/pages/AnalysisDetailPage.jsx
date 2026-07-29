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
  
  const [activeTab, setActiveTab] = useState('result');
  const [isDiffExpanded, setIsDiffExpanded] = useState(false);
  const [targetSearch, setTargetSearch] = useState({ type: null, value: null });

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

// --- 기존의 폴더/파일명 분리 로직은 삭제하셔도 됩니다 ---
  // 파일 경로를 슬래시(/) 단위로 잘라내기 위해 곧바로 사용합니다.
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

      {/* GitHub 스타일로 변경된 상단 정보 카드 */}
      <Card style={{ padding: '20px' }}>
        {/* 1. 경로 Breadcrumb (Repo / folder / file.jsx) */}
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

        {/* 2. 하단 부가 정보 (브랜치, 확장자) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
          {/* 브랜치 뱃지 스타일 */}
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
              <div className="gr-page__header" style={{ marginBottom: '16px' }}>
                <span className="text-body-sm">총 {data.totalIssues ?? 0}건의 이슈가 발견되었습니다.</span>
              </div>
              <div className="result-grid">
                {issues.map((issue, i) => (
                  <Card 
                    key={i} 
                    className="result-card" 
                    onClick={() => handleIssueClick(issue)}
                    style={{ cursor: (issue.line || issue.functionName) ? 'pointer' : 'default' }}
                  >
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
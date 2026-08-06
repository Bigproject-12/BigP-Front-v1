import { useEffect, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useConfirm } from '../context/ConfirmContext';
import { api } from '../lib/api';
// 프롬프트 추천 함수 및 버튼 컴포넌트 추가
import { recommendPrompt } from '../lib/aiService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import DiffViewer from '../components/ui/DiffViewer';
import AnalysisResult from '../components/analysis/AnalysisResult';
import PrCreateModal from '../components/analysis/PrCreateModal';
import './AnalyzePage.css';
import './RepoDetailPage.css';
import { Tabs } from '../components/ui/Tabs';

const TYPE_VARIANT = { 보안: 'warning', 비효율: 'info', 이슈: 'neutral'};

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
  const { confirm } = useConfirm();
  const analysisId = params.get('analysisId');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushed, setPushed] = useState(false);
  const [prUrl, setPrUrl] = useState(null);
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 기본 탭을 코드 비교(code)로 설정
  const [activeTab, setActiveTab] = useState('code');
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

  // --- 원본 프롬프트 재구성을 위한 상태 추가 ---
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [reconstructing, setReconstructing] = useState(false);
  const [reconstructError, setReconstructError] = useState('');
  const [reconstructResult, setReconstructResult] = useState(null);
  const [reconstructCopied, setReconstructCopied] = useState(false);
  // -------------------------------------------

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
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    if (!(await confirm('개선된 코드를 GitHub에 반영(push)하시겠습니까? \n 실제 저장소의 파일이 수정됩니다.', { title: '경고', danger: true }))) return;
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

  const openPrModal = () => setIsPrModalOpen(true);

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

  // --- 원본 프롬프트 재구성 핸들러 ---
  const handleReconstructPrompt = async () => {
    if (!originalPrompt.trim()) return;
    setReconstructing(true);
    setReconstructError('');
    setReconstructResult(null);
    setReconstructCopied(false);
    try {
      const result = await api.post(`/api/analysis/${analysisId}/reconstruct-prompt`, {
        originalPrompt: originalPrompt,
      });
      setReconstructResult(result);
    } catch (e) {
      setReconstructError(e.message || '프롬프트 재구성 중 오류가 발생했습니다.');
    } finally {
      setReconstructing(false);
    }
  };

  const handleCopyReconstructedPrompt = () => {
    const text = reconstructResult?.reconstructedPrompt ?? '';
    navigator.clipboard.writeText(text).then(() => {
      setReconstructCopied(true);
      setTimeout(() => setReconstructCopied(false), 2000);
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
  const duplicates = parseJsonArray(data.duplicateResult);
  
// AnalysisResult 컴포넌트가 기대하는 형태로 변환
  const issues = [
    ...vulnerabilities.map((v) => ({
      category: 'SECURITY',
      line: v.line ?? null,
      title: null,                    // 백엔드에 없음 → 규칙 사전이 채움
      message: v.message ?? '',
      ruleId: v.rule_id ?? null,
      functionName: null,             // 보안 이슈는 줄 번호로 점프
    })),
    ...complexityDetails.map((c) => ({
      category: 'PERFORMANCE',
      line: c.line ?? null,
      title: `${c.function_name} 함수 복잡도 ${c.complexity_score}`,
      message: c.message ?? '',
      ruleId: null,                   // lizard는 rule_id 없음
      functionName: c.function_name ?? null,   // 비효율은 함수명으로 점프
    })),

    ...duplicates.map((d) => {
      const similarityPct = d.similarity_score != null ? Math.round(d.similarity_score * 100) : null;
      return {
        category: 'DUPLICATE',
        line: null,                 // 매칭 대상이 다른 파일/함수라 현재 코드 내 위치 아님
        title: `기존 함수와 재사용 가능${similarityPct !== null ? ` (유사도 ${similarityPct}%)` : ''}`,
        message: `${d.file_path}의 ${d.function_name}() 함수와 거의 동일한 로직입니다.`, // d.code 제거
        ruleId: null,
        functionName: null,
      };
    }),
  ];

  const pathParts = data.filePath ? data.filePath.split('/') : [];

  // 분석 결과를 바탕으로 PR 제목/설명 기본값을 만든다
  const buildPrDefaults = () => {
    const fileName = data.filePath ? data.filePath.split('/').pop() : '코드';
    const countBy = (cat) => issues.filter((i) => i.category === cat).length;
    const security = countBy('SECURITY');
    const performance = countBy('PERFORMANCE');
    const total = issues.length;

    const title = `GuardrAil: ${fileName} 코드 개선 (이슈 ${total}건)`;
    const body =
      `분석 결과: 총 ${total}건의 이슈 개선.\n\n` +
      `- 파일: \`${data.filePath ?? ''}\`\n` +
      `- 보안 이슈: ${security}건\n` +
      `- 비효율 이슈: ${performance}건\n\n` +
      `분석 세부 내용은 분석 ID: ${analysisId}에서 확인 가능.`;

    return { title, body };
  };

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
          <span> </span>
          <span>•  확장자: <strong>{data.language ?? '-'}</strong></span>
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
            
            {/* 탭 순서 변경: 원본/개선 코드 비교가 먼저 오도록 수정 */}
            <Tabs
              items={[
                { key: 'code', label: '원본 / 개선 코드 비교' },
                { key: 'result', label: '분석 결과 및 설명' },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {pushError && <span className="text-body-sm ui-banner--error" style={{ margin: 0, padding: '4px 8px' }}>{pushError}</span>}
              {prUrl && <span className="text-body-sm ui-banner--success">PR 생성에 성공했습니다.</span>}
              {!prUrl && pushed && <span className="text-body-sm ui-banner--success">GitHub Push에 성공했습니다.</span>}
              {prUrl ? (
                <button
                    className="ui-btn ui-btn--primary ui-btn--md"
                    onClick={() => window.open(prUrl, '_blank', 'noopener,noreferrer')}
                >
                    GitHub에서 PR 확인
                </button>
              ) : pushed ? (
                <button className="ui-btn ui-btn--primary ui-btn--md" onClick={openPrModal}>
                    PR 생성 ({data.branch ?? 'main'})
                </button>
              ) : (
                <button
                    className="ui-btn ui-btn--primary ui-btn--md"
                    onClick={handlePush}
                    disabled={pushing}
                >
                    {pushing ? '반영 중…' : 'GitHub에 Push'}
                </button>
              )}
            </div>
          </div>

          {/* 원본/개선 코드 비교 탭 내용 */}
          {activeTab === 'code' && (
            <>
              <div className="diff-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '7px'
                }}>
              </div>

              <Card className="diff-card">
                <DiffViewer original={data.originCode} improved={data.modifiedCode || data.originCode} />
              </Card>

              {/* 코드 확인란 아래에 '분석 결과 및 설명 보기'로 이동하는 버튼 추가 */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setActiveTab('result');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  상세 분석 결과 및 설명 보기 ↓
                </Button>
              </div>
            </>
          )}

        {/* 분석 결과 및 설명 탭 내용 */}
          {activeTab === 'result' && (
            <div className="result-section result-section--detail">

              {/* 1. 종합 → 2. 개별 (AnalysisResult가 둘 다 담당) */}
              <div className="gr-page__header" style={{ marginBottom: '20px' }}></div>

              <AnalysisResult
                issues={issues}
                onIssueClick={handleIssueClick}
                aiProbability={data.aiProbability}
              />

              {/* 3. 행동 — 원본 프롬프트 재구성 (AI 생성 확률 30% 이상일 때만 노출) */}
              {data.aiProbability != null && data.aiProbability >= 30 && (
              <Card style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {data.aiProbability >= 70 && (
                  <div className="ui-banner ui-banner--error confidence-warning">
                    <Icon name="bug" size={16} /> AI가 작성했을 가능성이 높은 코드입니다.
                  </div>
                )}
                <div
                  className="prompt-section"
                  style={!(data.aiProbability >= 70) ? { borderTop: 'none', paddingTop: 0 } : undefined}
                >
                  <div className="prompt-section__header" style={{ marginBottom: '12px' }}>
                    <Icon name="edit" size={16} />
                    <h3 className="text-heading-md" style={{ margin: 0, marginLeft: '8px' }}>원본 프롬프트 재구성</h3>
                  </div>
                  <p className="prompt-section__desc text-body-sm" style={{ marginBottom: '16px' }}>
                    이 코드를 생성할 때 실제로 사용했던 프롬프트를 입력하면, 발견된 문제가 재발하지 않도록 프롬프트를 개선해드립니다.
                  </p>
                  <div className="prompt-section__input-row">
                    <textarea
                      className="prompt-section__textarea"
                      placeholder="이 코드를 생성할 때 AI에게 실제로 입력했던 프롬프트를 붙여넣어 주세요."
                      value={originalPrompt}
                      onChange={(e) => setOriginalPrompt(e.target.value)}
                      rows={2}
                    />
                    <Button variant="primary" onClick={handleReconstructPrompt} disabled={reconstructing || !originalPrompt.trim()}>
                      {reconstructing ? '재구성 중…' : '프롬프트 재구성받기'}
                    </Button>
                  </div>

                  {reconstructError && <div className="ui-banner ui-banner--error">{reconstructError}</div>}

                  {reconstructResult && (
                    <div className="prompt-result" style={{ marginTop: '16px' }}>
                      <div className="prompt-result__body">
                        <div className="prompt-result__header">
                          <span className="text-caption-md prompt-result__label">
                            발견된 문제가 반영된 개선된 프롬프트입니다.
                          </span>
                          <Button variant="ghost" size="sm" icon={<Icon name={reconstructCopied ? 'check' : 'copy'} size={20} />} onClick={handleCopyReconstructedPrompt}>
                            {reconstructCopied ? '복사됨' : '복사'}
                          </Button>
                        </div>
                        <pre className="prompt-result__text">{reconstructResult.reconstructedPrompt}</pre>
                        <p className="text-caption-md prompt-result__explanation">
                          <strong>재구성 이유</strong><br />{reconstructResult.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
              )}

            </div>
          )}
        </>
      )}

      {isPrModalOpen && (
        <PrCreateModal
          analysisIds={[Number(analysisId)]}
          repoId={data.repoId}
          headBranch={data.branch}
          defaultTitle={buildPrDefaults().title}
          defaultBody={buildPrDefaults().body}
          onClose={() => setIsPrModalOpen(false)}
          onCreated={(url) => {
            setPrUrl(url);
            setIsPrModalOpen(false);
          }}
        />
      )}

      {showScrollTop && (
        <button
          type="button"
          className="scroll-top-btn"
          aria-label="맨 위로 이동"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Icon name="arrowUp" size={18} />
        </button>
      )}
    </>
  );
}
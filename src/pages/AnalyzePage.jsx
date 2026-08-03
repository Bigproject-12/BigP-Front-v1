import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';

import { useRepos } from '../context/RepoContext';
// fetchBranches 함수 추가
import { fetchBranches, fetchRepoTree, fetchFileContent, fetchRepoBranches } from '../lib/github';

import { detectAiGeneratedCode, recommendPrompt } from '../lib/aiService';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import DiffViewer from '../components/ui/DiffViewer';
import AnalysisResult from '../components/analysis/AnalysisResult';
import { Tabs } from '../components/ui/Tabs';
import './AnalyzePage.css';

// 👈 히스토리 페이지와 동일한 상단 탭 메뉴 추가
const TOP_TABS = [
  { key: 'history', label: '히스토리' },
  { key: 'analyze', label: '코드 분석' },
];

function parseJsonArray(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AnalyzePage() {
  const { params, navigate } = useRouter();
  const { user } = useAuth();

  const { repos, reposLoading } = useRepos();
  const [branches, setBranches] = useState([]);
  const [files, setFiles] = useState([]);
  const hasNoData = !reposLoading && repos.length === 0;

  const [repoId, setRepoId] = useState('');
  const [branch, setBranch] = useState('');
  const [filePath, setFilePath] = useState('');
  const [fileNameOverride, setFileNameOverride] = useState('');

  // 선택된 확장자 필터 상태
  const [selectedExt, setSelectedExt] = useState('');

  const [originalCode, setOriginalCode] = useState('');
  const [improvedCode, setImprovedCode] = useState('');
  const [issues, setIssues] = useState([]);
  const [issueCount, setIssueCount] = useState(null);
  const [improvableRatio, setImprovableRatio] = useState(null);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0); // 👈 진척도(% 단위) 상태 추가
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  
  const [pushAnalysisId, setPushAnalysisId] = useState(null);
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushed, setPushed] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [prError, setPrError] = useState('');
  const [prUrl, setPrUrl] = useState(null);
  const [prBranches, setPrBranches] = useState([]);
  const [prBaseBranch, setPrBaseBranch] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const fileInputRef = useRef(null);
  const originalTextareaRef = useRef(null);
  
  const originalLineCount = useMemo(
    () => (originalCode ? originalCode.split('\n').length : 1),
    [originalCode]
  );
  const improvedLineCount = useMemo(
    () => (improvedCode ? improvedCode.split('\n').length : 1),
    [improvedCode]
  );

  // 레포/브랜치/파일을 바꿀 때 이전 분석 결과 초기화
  const resetAnalysisOutput = () => {
    setAnalyzed(false);
    setCompareMode(false);
    setImprovedCode('');
    setIssues([]);
    setIssueCount(null);
    setImprovableRatio(null);
    setAiDetection(null);
    setDetectError('');
    setPromptResult(null);
    setCurrentAnalysisId(null);
    setPushAnalysisId(null);
    setPushed(false);
    setPushError('');
    setCreatingPr(false);
    setPrError('');
    setPrUrl(null);
    setPrBranches([]);
    setPrBaseBranch('');
  };

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = originalTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [originalCode]);

  const [aiDetection, setAiDetection] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [promptResult, setPromptResult] = useState(null);
  const [promptTab, setPromptTab] = useState('improve');
  const [recommending, setRecommending] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptElapsed, setPromptElapsed] = useState(null);

  const [originalPrompt, setOriginalPrompt] = useState('');
  const [reconstructing, setReconstructing] = useState(false);
  const [reconstructError, setReconstructError] = useState('');
  const [reconstructResult, setReconstructResult] = useState(null);
  const [reconstructCopied, setReconstructCopied] = useState(false);

  const availableExtensions = useMemo(() => {
    const exts = new Set();
    files.forEach((path) => {
      const parts = path.split('/');
      const fileName = parts[parts.length - 1];
      if (fileName.includes('.')) {
        exts.add(fileName.split('.').pop());
      } else {
        exts.add('기타');
      }
    });
    return Array.from(exts).sort();
  }, [files]);

  const groupedFiles = useMemo(() => {
    return files.reduce((acc, path) => {
      const parts = path.split('/');
      const fileName = parts[parts.length - 1];
      const ext = fileName.includes('.') ? fileName.split('.').pop() : '기타';

      if (selectedExt && ext !== selectedExt) {
        return acc;
      }

      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '루트 디렉토리';
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push({ path: path, name: fileName });
      return acc;
    }, {});
  }, [files, selectedExt]);

  const [activeTab, setActiveTab] = useState('analyze');
  const selectedRepo = repos.find((r) => String(r.id) === repoId);

  useEffect(() => {
    if (!selectedRepo) { 
      setBranches([]); 
      return; 
    }
    fetchBranches(selectedRepo.fullName).then(setBranches).catch(() => setBranches([]));
  }, [repoId, selectedRepo?.fullName]);

  useEffect(() => {
    if (!pushed || !repoId) return;
    fetchRepoBranches(Number(repoId))
      .then((list) => {
        setPrBranches(list ?? []);
        const defaultBranch = (list ?? []).find((b) => b.isDefault);
        if (defaultBranch) setPrBaseBranch(defaultBranch.name);
      })
      .catch(() => setPrBranches([]));
  }, [pushed, repoId]);

  useEffect(()=>{
    if (!selectedRepo || !branch){
      setFiles([]);
      return;
    }
    fetchRepoTree(selectedRepo.fullName, branch).then(setFiles).catch(()=>setFiles([]));
  }, [branch, selectedRepo?.fullName]);

  useEffect(() => {
    const initialRepoId = params.get('repoId');
    if (initialRepoId) setRepoId(initialRepoId);
  }, [params]);

  useEffect(() => {
    if (!filePath || !selectedRepo || !branch) return;
    setFileNameOverride('');
    resetAnalysisOutput();
    fetchFileContent(selectedRepo.fullName, filePath, branch)
      .then((content) => { setOriginalCode(content); })
      .catch(() => {});
  }, [filePath, branch, selectedRepo?.fullName]);

  useEffect(() => {
    const analysisId = params.get('analysisId');
    if (!analysisId) return;

    setAnalyzing(true);
    setCompareMode(true);

    api.get(`/api/analysis/${analysisId}`)
      .then((data) => {
        if (!data) return;
        if (data.repoId) {
          setRepoId(String(data.repoId));
        }
        
        setOriginalCode(data.originCode || '');
        setImprovedCode(data.modifiedCode || '');
        
        if (data.filePath) {
          setFileNameOverride(data.filePath.split('/').pop());
        }

        const vulnerabilities = parseJsonArray(data.secuResult);
        const complexityDetails = parseJsonArray(data.inefficiencyResult);
        const duplicates = parseJsonArray(data.duplicateResult);

        setIssues([
          ...vulnerabilities.map((v) => ({
            category: 'SECURITY',
            line: v.line ?? null,
            title: null,
            message: v.message ?? '',
            ruleId: v.rule_id ?? null,
            functionName: null,
          })),
          ...complexityDetails.map((c) => ({
            category: 'PERFORMANCE',
            line: c.line ?? null,
            title: `${c.function_name} 함수 복잡도 ${c.complexity_score}`,
            message: c.message ?? '',
            ruleId: null,
            functionName: c.function_name ?? null,
          })),
          ...duplicates.map((d) => {
            const similarityPct = d.similarity_score != null ? Math.round(d.similarity_score * 100) : null;
            return {
              category: 'DUPLICATE',
              line: null,
              title: `기존 함수와 재사용 가능${similarityPct !== null ? ` (유사도 ${similarityPct}%)` : ''}`,
              message: `${d.file_path}의 ${d.function_name}() 함수와 거의 동일한 로직입니다.`,
              codeSnippet: d.code ?? null,
              ruleId: null,
              functionName: null,
            };
          }),
        ]);
        
        setIssueCount(data.totalIssues ?? 0);
        setImprovableRatio(
          typeof data.improvableRatio === 'number' ? data.improvableRatio : null
        );
        
        setAiDetection({
          isAiGenerated: !!data.aiGenerated,
          confidence: data.aiProbability ?? null,
          reasons: [],
          hasVulnerability: vulnerabilities.length > 0,
          vulnerabilities,
        });
        
        setAnalyzed(true);
        setPushAnalysisId(Number(analysisId));
        setPushed(false);
        setPushError('');
      })
      .catch((err) => {
        console.error('분석 결과 조회 실패:', err);
        setDetectError('기존 분석 결과를 불러오는 데 실패했습니다.');
      })
      .finally(() => {
        setAnalyzing(false);
      });
  }, [params]);

  const activeFileName = fileNameOverride || (filePath ? filePath.split('/').pop() : '');

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalCode(String(reader.result || ''));
      setFileNameOverride(file.name);
      setFilePath('');
      resetAnalysisOutput();
    };
    reader.readAsText(file);
  };

  const handleTopTabChange = (key) => {
    if (key === 'history') {
      if (originalCode.trim() || analyzed) {
        const confirmLeave = window.confirm(
          "화면을 이동하면 현재 작업 중인 코드와 분석 결과가 초기화됩니다.\n히스토리로 이동하시겠습니까?"
        );
        if (!confirmLeave) return;
      }

      if (repoId && repoId !== 'custom') {
        navigate(`/?page=repo-detail&repoId=${repoId}`);
      } else {
        navigate('/?page=repolist');
      }
    }
  };

  // 👈 진척도 계산 로직이 포함된 분석 실행 함수
  const handleAnalyze = async () => {
    if (!originalCode.trim()) return;
    if (!repoId) { 
      setDetectError('먼저 분석할 Repository를 선택하거나 직접 입력을 선택해 주세요'); 
      return; 
    }

    setAnalyzing(true);
    setProgress(5); // 시작 시 초기 진척도 설정
    setCompareMode(false);
    setAiDetection(null);
    setDetectError('');
    setPromptResult(null);
    setPushed(false);
    setPushError('');

    let timer = null;
    const startedAt = Date.now();

    try {
      // 가상 진척도 타이머 (최대 120초 기준 백분율 증가)
      timer = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const calculated = Math.min(Math.floor((elapsed / 120000) * 95), 95);
        setProgress((prev) => (calculated > prev ? calculated : prev));
      }, 1000);

      const ext = activeFileName.includes('.') ? activeFileName.split('.').pop().toUpperCase() : 'JAVA';
      
      const { analysis_id } = await api.post('/api/analysis', {
        code_content: originalCode,
        repoId: repoId === 'custom' || !repoId ? null : Number(repoId),
        language: ext,
        prompt: null,
        filePath: filePath || fileNameOverride || null,
        branch: branch || null,
      });

      setCurrentAnalysisId(analysis_id);

      let data = null;
      while (Date.now() - startedAt < 120000) {
        data = await api.get(`/api/analysis/${analysis_id}`);
        if (data.status !== 'ANALYZING') break;
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      clearInterval(timer);
      setProgress(100);

      if (!data || data.status === 'ANALYZING') {
        throw new Error('코드 분석이 비정상적으로 오래걸립니다. 잠시 후 다시 시도해주세요.');
      }
      if (data.status === 'CANCELED') { 
        setDetectError('분석이 취소되었습니다.'); 
        return; 
      }
      if (data.status === 'FAILED') throw new Error('분석에 실패했습니다.');

      const vulnerabilities = parseJsonArray(data.secuResult);
      const complexityDetails = parseJsonArray(data.inefficiencyResult);
      const duplicates = parseJsonArray(data.duplicateResult);

      setImprovedCode(data.modifiedCode || originalCode);
      setIssues([
        ...vulnerabilities.map((v) => ({
          category: 'SECURITY',
          line: v.line ?? null,
          title: null,
          message: v.message ?? '',
          ruleId: v.rule_id ?? null,
          functionName: null,
        })),
        ...complexityDetails.map((c) => ({
          category: 'PERFORMANCE',
          line: c.line ?? null,
          title: `${c.function_name} 함수 복잡도 ${c.complexity_score}`,
          message: c.message ?? '',
          ruleId: null,
          functionName: c.function_name ?? null,
        })),
        ...duplicates.map((d) => {
          const similarityPct = d.similarity_score != null ? Math.round(d.similarity_score * 100) : null;
          return {
            category: 'DUPLICATE',
            line: null,
            title: `기존 함수와 재사용 가능${similarityPct !== null ? ` (유사도 ${similarityPct}%)` : ''}`,
            message: `${d.file_path}의 ${d.function_name}() 함수와 거의 동일한 로직입니다.`,
            ruleId: null,
            functionName: null,
          };
        }),
      ]);
      setIssueCount(data.totalIssues ?? 0);
      setImprovableRatio(
        typeof data.improvableRatio === 'number' ? data.improvableRatio : null
      );
      setAiDetection({
        isAiGenerated: !!data.aiGenerated,
        confidence: data.aiProbability ?? null,
        reasons: [],
        hasVulnerability: vulnerabilities.length > 0,
        vulnerabilities,
      });
      setAnalyzed(true);
      setPushAnalysisId(data.analysisId ?? null);
    } catch (e) {
      setDetectError(e.message || '분석 중 오류가 발생했습니다.');
    } finally {
      if (timer) clearInterval(timer);
      setAnalyzing(false);
      setProgress(0);
      setCurrentAnalysisId(null);
    }
  };

  const handleStopAnalysis = async () => {
    if (!currentAnalysisId) return;
    try {
      await api.patch(`/api/analysis/${currentAnalysisId}`);
    } catch {
      // 무시
    } finally {
      setAnalyzing(false);
      setProgress(0);
      setCurrentAnalysisId(null);
    }
  };

  const handlepush = async () => {
    if (!window.confirm('개선된 코드를 GitHub에 반영(push)하시겠습니까? 실제 저장소의 파일이 수정됩니다.')) return;
    if (!pushAnalysisId) return;
    setPushing(true);
    setPushError('');
    try {
      await api.post(`/api/analysis/${pushAnalysisId}/push`);
      setPushed(true);
    } catch (e) {
      setPushError(e.message || 'GitHub에 반영하지 못했습니다.');
    } finally {
      setPushing(false);
    }
  };

  const handleCreatePr = async () => {
    if (!pushAnalysisId) return;
    setCreatingPr(true);
    setPrError('');
    try {
      const result = await api.post(`/api/analysis/${pushAnalysisId}/pr`, { baseBranch: prBaseBranch });
      setPrUrl(result.prUrl);
    } catch (e) {
      setPrError(e.message || 'PR 생성에 실패했습니다.');
    } finally {
      setCreatingPr(false);
    }
  };

  const goToMyPage = () =>{
    if (navigate){
      navigate('?page=mypage#github-section');
    }else{
      window.location.hash='#/mypage#gihub-section';
    }
  };

  const handleDetectAi = async () => {
    if (!originalCode.trim()) return;
    setDetecting(true);
    setDetectError('');
    setAiDetection(null);
    setPromptResult(null);
    setPromptTab('improve');
    setUserPrompt('');
    try {
      const { result } = await detectAiGeneratedCode(originalCode);
      setAiDetection(result);
    } catch (e) {
      setDetectError(e.message || 'AI 감지 중 오류가 발생했습니다.');
    } finally {
      setDetecting(false);
    }
  };

  const TAB_ITEMS = [
    { key: 'analyze', label: '코드 분석' },
    { key: 'ai', label: '분석 결과 및 설명' },
  ];

  return (
    <div className="analyze-page">
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">코드 분석</h1>
          <span className="text-body-sm">
            {user ? `${user.name}님의 저장소 코드를 분석하고 개선안을 확인하세요.` : ''}
          </span>
        </div>
      </div>

      {repoId && repoId !== 'custom' && (
        <Tabs items={TOP_TABS} active="analyze" onChange={handleTopTabChange} />
      )}

      <Card>
        <div className="analyze-toolbar">
          {hasNoData ? (
            <div style={{display: 'flex', alignItems: 'center', gap:'12px', flex:1}}>
              <span className="text-body-sm" style={{color: 'var(--text-muted)'}}>
                {reposLoading ? 'GitHub 연동 정보를 확인 중입니다…' : 'GitHub가 아직 연동되지 않았습니다. 코드를 불러오려면 연동을 진행해 주세요.'}
              </span>
              <Button variant="primary" size="sm" onClick={goToMyPage} disabled={reposLoading}>
                GitHub 연동하러 가기
              </Button>
            </div>
          ) : (
            <>
              <div className="analyze-toolbar__field">
                <label>Repository</label>
                <Select
                  value={repoId}
                  onChange={(e) => {
                    setRepoId(e.target.value);
                    setBranch('');
                    setFilePath('');
                    setFileNameOverride('');
                    setSelectedExt('');
                    setOriginalCode('');
                    resetAnalysisOutput();
                  }}
                  disabled={analyzing}
                >
                  <option value="">Repository 선택</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
              </div>

              <div className="analyze-toolbar__field">
                <label>Branch</label>
                <Select
                  value={branch}
                  onChange={(e)=>{
                    setBranch(e.target.value);
                    setFilePath('');
                    setFileNameOverride('');
                    setSelectedExt('');
                    setOriginalCode('');
                    resetAnalysisOutput();
                  }}
                  disabled={!repoId || analyzing}
                >
                  <option value="">브랜치 선택</option>
                  {branches.map((b)=>(
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Select>
              </div>

              <div className="analyze-toolbar__field" style={{ maxWidth: '140px' }}>
                <label>확장자 필터</label>
                <Select
                  value={selectedExt}
                  onChange={(e) => {
                    const nextExt = e.target.value;
                    setSelectedExt(nextExt);
                    if (filePath && nextExt) {
                      const fileName = filePath.split('/').pop();
                      const ext = fileName.includes('.') ? fileName.split('.').pop() : '기타';
                      if (ext !== nextExt) {
                        setFilePath('');
                        setOriginalCode('');
                        resetAnalysisOutput();
                      }
                    }
                  }}
                  disabled={!branch || analyzing}
                >
                  <option value="">모든 확장자</option>
                  {availableExtensions.map((ext) => (
                    <option key={ext} value={ext}>*.{ext}</option>
                  ))}
                </Select>
              </div>

              <div className="analyze-toolbar__field">
                <label>폴더 / 파일</label>
                <Select
                  value={filePath || (fileNameOverride ? 'custom' : '')}
                  onChange={(e) => {
                    setFilePath(e.target.value);
                    setFileNameOverride('');
                    setCompareMode(false);
                    setAnalyzed(false);
                  }}
                  disabled={!branch || analyzing}
                >
                  <option value="">파일 선택</option>
                  {fileNameOverride && <option value="custom" disabled>{fileNameOverride}</option>}
                  {Object.entries(groupedFiles).map(([folder, fileList]) => (
                    <optgroup key={folder} label={`📂 ${folder}`}>
                      {fileList.map((file) => (
                        <option key={file.path} value={file.path}>
                          📄 {file.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div className="analyze-toolbar__spacer" />
          <input
            ref={fileInputRef}
            type="file"
            className="visually-hidden"
            onChange={handleUpload}
            accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.rb,.txt"
          />
          <Button variant="secondary" size="sm" icon={<Icon name="upload" size={15} />} onClick={() => fileInputRef.current?.click()} disabled={analyzing}>
            파일 업로드
          </Button>
        </div>
      </Card>

      {compareMode && (
        <div className="ui-banner ui-banner--success">
          <Icon name="compare" size={16} /> 히스토리에서 불러온 분석 결과입니다.
        </div>
      )}

      <Tabs items={TAB_ITEMS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'analyze' && (
        <>
          <div className="analyze-toolbar" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              {!pushed && (
                analyzing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Button variant="danger" onClick={handleStopAnalysis}>
                      분석 중지
                    </Button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="ui-spinner" aria-hidden="true" />
                      {/* 👈 퍼센트 진척도 텍스트 출력 영역 */}
                      <span className="text-body-sm" style={{ fontWeight: 600, color: 'var(--ps-primary)' }}>
                        코드 분석 중... {progress}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <Button variant="primary" onClick={handleAnalyze} disabled={!originalCode.trim()}>
                    분석하기
                  </Button>
                )
              )}
            </div>

            {analyzed && pushAnalysisId && branch && filePath && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {pushError && <span className="text-body-sm ui-banner--error">{pushError}</span>}
                  <Button variant="primary" onClick={handlepush} disabled={pushing || pushed}>
                    {pushed ? '반영 완료 ✓' : pushing ? '반영 중 …' : 'GitHub에 Push'}
                  </Button>
                </div>

                {pushed && (
                  prUrl ? (
                    <Button variant="secondary" onClick={() => window.open(prUrl, '_blank', 'noopener,noreferrer')}>
                      GitHub에서 PR 확인
                    </Button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span className="text-body-sm" style={{ color: 'var(--text-muted)' }}>base:</span>
                        <Select value={prBaseBranch} onChange={(e) => setPrBaseBranch(e.target.value)}>
                          {prBranches.length === 0 && <option value="">브랜치 불러오는 중…</option>}
                          {prBranches.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name}{b.isDefault ? ' (default)' : ''}
                            </option>
                          ))}
                        </Select>
                        <span className="text-body-sm" style={{ color: 'var(--text-muted)' }}>←</span>
                        <span className="text-body-sm" style={{ color: 'var(--text-muted)' }}>compare:</span>
                        <span
                          className="text-body-sm"
                          style={{
                            backgroundColor: 'var(--surface-soft)',
                            border: '1px solid var(--border-hairline-strong)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 10px',
                          }}
                        >
                          {branch}
                        </span>
                      </div>
                      <Button variant="primary" onClick={handleCreatePr} disabled={creatingPr || !prBaseBranch}>
                        {creatingPr ? 'PR 생성 중…' : 'Pull Request 생성'}
                      </Button>
                      {prError && <span className="text-body-sm ui-banner--error">{prError}</span>}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {analyzed && improvedCode ? (
            <Card className="diff-card">
              <DiffViewer original={originalCode} improved={improvedCode} />
            </Card>
          ) : (
            <Card className="diff-card">
              <div className="diff-viewer">
                <div className="diff-pane diff-pane--left">
                  <div className="diff-pane__label">
                    원본{activeFileName ? ` · ${activeFileName}` : ''}
                  </div>
                  <div className="diff-pane__code">
                    <div className="code-editor">
                      <div className="code-editor__gutter">
                        {Array.from({ length: originalLineCount }, (_, i) => (
                          <div key={i + 1}>{i + 1}</div>
                        ))}
                      </div>
                      <textarea
                        ref={originalTextareaRef}
                        className="code-textarea"
                        placeholder="분석할 코드를 붙여넣거나 파일을 업로드해주세요."
                        value={originalCode}
                        onChange={(e) => {
                          setOriginalCode(e.target.value);
                          setAnalyzed(false);
                          setCompareMode(false);
                        }}
                        spellCheck={false}
                        readOnly={compareMode}
                      />
                    </div>
                  </div>
                </div>

                <div className="diff-pane">
                  <div className="diff-pane__label">
                    개선{analyzed && improvableRatio !== null ? ` · 개선 가능률 ${improvableRatio.toFixed(1)}%` : ''}
                  </div>
                  <div className="diff-pane__code">
                    {improvedCode ? (
                      <div className="code-editor">
                        <div className="code-editor__gutter">
                          {Array.from({ length: improvedLineCount }, (_, i) => (
                            <div key={i + 1}>{i + 1}</div>
                          ))}
                        </div>
                        <pre className="code-view">{improvedCode}</pre>
                      </div>
                    ) : (
                      <div className="code-view code-view--empty">
                        {analyzed ? '개선점이 발견되지 않았습니다.' : '분석하기를 실행하면 개선된 코드가 표시됩니다.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {detectError && (
            <div className="ui-banner ui-banner--error">
              <Icon name="close" size={16} /> {detectError}
            </div>
          )}
        </>
      )}

      {activeTab === 'ai' && (
        <>
          <div className="analyze-actions">
            {!originalCode.trim() && (
              <span className="text-caption-md" style={{ color: 'var(--text-muted)' }}>
                코드 분석 탭에서 코드를 먼저 입력해주세요.
              </span>
            )}
          </div>

          {analyzed && (
            <div className="result-section result-section--detail">
              <AnalysisResult
                issues={issues}
                aiProbability={aiDetection?.confidence ?? null}
              />
            </div>
          )}

          {detectError && (
            <div className="ui-banner ui-banner--error">
              <Icon name="close" size={16} /> {detectError}
            </div>
          )}

          {!aiDetection && !detecting && !detectError && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
              <Card className="ai-empty">
                <Icon name="spark" size={32} />
                <p className="text-body-sm">AI 생성 코드 감지 버튼을 눌러 분석을 시작하세요.</p>
              </Card>
              <Button variant="primary" onClick={handleDetectAi} disabled={detecting || !originalCode.trim()}>
                {detecting ? 'AI 감지 중…' : 'AI 생성 코드 감지'}
              </Button>
            </div>
          )}
        </>
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
    </div>
  );
}
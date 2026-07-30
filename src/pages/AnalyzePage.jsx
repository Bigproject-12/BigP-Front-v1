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
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import DiffViewer from '../components/ui/DiffViewer';
import { Tabs } from '../components/ui/Tabs';
import './AnalyzePage.css';

const TYPE_VARIANT = { 보안: 'warning', 비효율: 'info', 이슈: 'neutral' };

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

function getConfidenceLevel(probability) {
  if (probability >= 70) return 'high';
  if (probability >= 40) return 'medium';
  return 'low';
}

async function runAnalysis({ repoId, language, code,filePath,branch,onStarted }) {
  const { analysis_id } = await api.post('/api/analysis', {
    code_content: code,
    // 'custom'인 경우 repoId를 null로 전송
    repoId: repoId === 'custom' || !repoId ? null : Number(repoId),
    language,
    prompt: null,
    filePath: filePath || null,
    branch: branch || null,
  });

  if (onStarted) onStarted(analysis_id);

  const startedAt = Date.now();
  while (Date.now() - startedAt < 120000) {
    const data = await api.get(`/api/analysis/${analysis_id}`);
    if (data.status !== 'ANALYZING') return data;
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error('코드 분석이 비정상적으로 오래걸립니다. 잠시 후 다시 시도해주세요.');
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
  const [diffMode, setDiffMode] = useState(false);
  const fileInputRef = useRef(null);

  // AI 감지 & 프롬프트 추천 상태
  const [aiDetection, setAiDetection] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [promptResult, setPromptResult] = useState(null);
  const [promptTab, setPromptTab] = useState('improve');
  const [recommending, setRecommending] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  const [detectElapsed, setDetectElapsed] = useState(null);
  const [promptElapsed, setPromptElapsed] = useState(null);

  // --- 원본 프롬프트 재구성을 위한 상태 추가 ---
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [reconstructing, setReconstructing] = useState(false);
  const [reconstructError, setReconstructError] = useState('');
  const [reconstructResult, setReconstructResult] = useState(null);
  const [reconstructCopied, setReconstructCopied] = useState(false);
  // -------------------------------------------

  // 저장소에 있는 모든 파일들의 확장자 목록을 중복 없이 추출
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

  // 확장자 필터가 적용된 상태로 폴더별 그룹화 수행
  const groupedFiles = useMemo(() => {
    return files.reduce((acc, path) => {
      const parts = path.split('/');
      const fileName = parts[parts.length - 1];
      const ext = fileName.includes('.') ? fileName.split('.').pop() : '기타';

      // 선택한 확장자와 일치하지 않으면 제외
      if (selectedExt && ext !== selectedExt) {
        return acc;
      }

      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '루트 디렉토리';
      
      if (!acc[folder]) acc[folder] = [];
      
      acc[folder].push({ 
        path: path, 
        name: fileName 
      });
      
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

  // Push 성공 후 PR 대상(base) 브랜치 선택지 불러오기
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
    setAnalyzed(false);
    setCompareMode(false);
    setAiDetection(null);
    setDetectError('');
    setPromptResult(null);
    fetchFileContent(selectedRepo.fullName, filePath, branch)
      .then((content) => { setOriginalCode(content); })
      .catch(() => {});
  }, [filePath, branch, selectedRepo?.fullName]);

  // 히스토리에서 analysisId를 들고 들어왔을 때 기존 분석 결과 불러오기
  useEffect(() => {
    const analysisId = params.get('analysisId');
    if (!analysisId) return;

    setAnalyzing(true);
    setCompareMode(true); // 비교 모드 활성화

    api.get(`/api/analysis/${analysisId}`)
      .then((data) => {
        if (!data) return;

        // 🚨 새로고침 등으로 repoId가 비어있을 경우, 백엔드 데이터로 복구
        if (data.repoId) {
          setRepoId(String(data.repoId));
        }
        
        // 백엔드 DTO 필드명(originCode, modifiedCode)에 맞춤[cite: 4]
        setOriginalCode(data.originCode || '');
        setImprovedCode(data.modifiedCode || '');
        
        // 파일 경로 설정
        if (data.filePath) {
          setFileNameOverride(data.filePath.split('/').pop());
        }

        // 이슈 파싱 (secuResult, inefficiencyResult)[cite: 4]
        const vulnerabilities = parseJsonArray(data.secuResult);
        const complexityDetails = parseJsonArray(data.inefficiencyResult);

        setIssues([
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
      setCompareMode(false);
      setAnalyzed(false);
      setAiDetection(null);
      setDetectError('');
      setPromptResult(null);
    };
    reader.readAsText(file);
  };

  // 👈 상단 탭 클릭 시 히스토리(RepoDetailPage)로 돌아가는 기능 추가
  const handleTopTabChange = (key) => {
    if (key === 'history') {
      // 💡 코드가 입력되어 있거나, 이미 분석을 돌린 상태라면 경고창을 띄움
      if (originalCode.trim() || analyzed) {
        const confirmLeave = window.confirm(
          "화면을 이동하면 현재 작업 중인 코드와 분석 결과가 초기화됩니다.\n히스토리로 이동하시겠습니까?"
        );
        if (!confirmLeave) return; // 사용자가 '취소'를 누르면 탭 이동을 막음
      }

      // '확인'을 누르거나 초기 상태일 때만 이동 허용
      if (repoId && repoId !== 'custom') {
        navigate(`/?page=repo-detail&repoId=${repoId}`);
      } else {
        navigate('/?page=repolist');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!originalCode.trim()) return;
    if (!repoId) { setDetectError('먼저 분석할 Repository를 선택하거나 직접 입력을 선택해 주세요'); return; }
    setAnalyzing(true);
    setCompareMode(false);
    setAiDetection(null);
    setDetectError('');
    setPromptResult(null);
    setPushed(false);
    setPushError('');
    try {
      const ext = activeFileName.includes('.') ? activeFileName.split('.').pop().toUpperCase() : 'JAVA';
      const data = await runAnalysis({ repoId, language: ext, code: originalCode, filePath: filePath || fileNameOverride || null, branch: branch || null, onStarted: setCurrentAnalysisId });
      if (data.status === 'CANCELED') { setDetectError('분석이 취소되었습니다.'); return; }
      if (data.status === 'FAILED') throw new Error('분석에 실패했습니다.');

      const vulnerabilities = parseJsonArray(data.secuResult);
      const complexityDetails = parseJsonArray(data.inefficiencyResult);

      setImprovedCode(data.modifiedCode || originalCode);
      setIssues([
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
      setAnalyzing(false);
      setCurrentAnalysisId(null);
    }
  };

  const handleStopAnalysis = async () => {
    if (!currentAnalysisId) return;
    try {
      await api.patch(`/api/analysis/${currentAnalysisId}`);
    } catch {
      /* 폴링 쪽에서 최종 상태를 다시 확인하니 여기선 무시해도 됨 */
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
    setDetectElapsed(null);
    try {
      const { result, elapsedMs } = await detectAiGeneratedCode(originalCode);
      setAiDetection(result);
      setDetectElapsed(elapsedMs);
    } catch (e) {
      setDetectError(e.message || 'AI 감지 중 오류가 발생했습니다.');
    } finally {
      setDetecting(false);
    }
  };

  const handleRecommendPrompt = async () => {
    if (!originalCode.trim()) return;
    setRecommending(true);
    setPromptError('');
    setPromptResult(null);
    setPromptCopied(false);
    setPromptElapsed(null);
    try {
      const { result, elapsedMs } = await recommendPrompt(originalCode, userPrompt);
      setPromptResult(result);
      setPromptElapsed(elapsedMs);
    } catch (e) {
      setPromptError(e.message || '프롬프트 추천 중 오류가 발생했습니다.');
    } finally {
      setRecommending(false);
    }
  };

  const handleReconstructPrompt = async () => {
    if (!originalPrompt.trim() || !pushAnalysisId) return;
    setReconstructing(true);
    setReconstructError('');
    setReconstructResult(null);
    setReconstructCopied(false);
    try {
      const result = await api.post(`/api/analysis/${pushAnalysisId}/reconstruct-prompt`, {
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

  const handleCopyPrompt = () => {
    const text = promptResult?.[promptTab]?.prompt ?? '';
    navigator.clipboard.writeText(text).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  const TAB_ITEMS = [
    { key: 'analyze', label: '코드 분석' },
    { key: 'ai', label: 'AI 판별' },
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

      {/* 👈 여기에 상단 탭 렌더링 (현재 위치는 'analyze'로 활성화) */}
      {repoId && repoId !== 'custom' && (
        <Tabs items={TOP_TABS} active="analyze" onChange={handleTopTabChange} />
      )}

      {/* 파일 선택 툴바 — 탭 공통 영역 */}
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
              {/* 1. Repository 선택 (정상적으로 repos 목록 출력) */}
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
                    setCompareMode(false);
                    setAnalyzed(false);
                    if (e.target.value === 'custom') setOriginalCode('');//직접 입력
                  }}
                  disabled={analyzing}
                >
                  <option value="">Repository 선택</option>
                  {/*<option value="custom">✍️ 코드 직접 입력</option>*/}
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
              </div>

          {/* 2. 브랜치 선택 */}
          <div className="analyze-toolbar__field">
            <label>Branch</label>
            <Select
              value={branch}
              onChange={(e)=>{
                setBranch(e.target.value);
                setFilePath(''); 
                setFileNameOverride('');
                setSelectedExt('');
                setCompareMode(false);
                setAnalyzed(false);
              }}
              disabled={!repoId || analyzing}
              //disabled={!repoId || repoId === 'custom'}// 👈 'custom'일 때 비활성화
            >
              <option value="">브랜치 선택</option>
              {branches.map((b)=>(
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
          </div>

          {/* 3. 확장자 필터 선택 (파일 선택보다 앞으로 이동) */}
          <div className="analyze-toolbar__field" style={{ maxWidth: '140px' }}>
            <label>확장자 필터</label>
            <Select
              value={selectedExt}
              onChange={(e) => {
                const nextExt = e.target.value;
                setSelectedExt(nextExt);

                // 이미 선택된 파일이 새 필터에서 탈락할 때만 초기화
                if (filePath && nextExt) {
                  const fileName = filePath.split('/').pop();
                  const ext = fileName.includes('.') ? fileName.split('.').pop() : '기타';
                  if (ext !== nextExt) {
                    setFilePath('');
                    setOriginalCode('');
                    setAnalyzed(false);
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

          {/* 4. 폴더/파일 선택 (확장자 필터 뒤로 이동) */}
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

              {/* groupedFiles는 selectedExt가 이미 반영된 결과 */}
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

      {/* 메인 탭 */}
      <Tabs items={TAB_ITEMS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'analyze' && (
        <>
          {analyzed && improvedCode && (
            <div className="analyze-view-toggle">
              <button
                className={`view-toggle-btn ${!diffMode ? 'view-toggle-btn--active' : ''}`}
                onClick={() => setDiffMode(false)}
              >
                <Icon name="code" size={14} /> 분리 보기
              </button>
              <button
                className={`view-toggle-btn ${diffMode ? 'view-toggle-btn--active' : ''}`}
                onClick={() => setDiffMode(true)}
              >
                <Icon name="compare" size={14} /> 변경점 비교
              </button>
            </div>
          )}

          {diffMode && analyzed && improvedCode ? (
            <Card className="diff-card">
              <DiffViewer original={originalCode} improved={improvedCode} />
            </Card>
          ) : (
            <div className="analyze-panes">
              <Card className="code-pane">
                <div className="code-pane__header">
                  <h2 className="text-heading-md">원본 소스코드</h2>
                  {activeFileName && <span className="text-caption-md">{activeFileName}</span>}
                </div>
                <div className="code-pane__body">
                  <textarea
                    className="code-textarea"
                    placeholder="분석할 코드를 붙여넣거나 파일을 업로드해주세요."
                    style={{ resize: 'none' }}
                    value={originalCode}
                    onChange={(e) => {
                      setOriginalCode(e.target.value);
                      setAnalyzed(false);
                      setCompareMode(false);
                      setDiffMode(false);
                    }}
                    spellCheck={false}
                    readOnly={compareMode}
                  />
                </div>
              </Card>

              <Card className="code-pane">
                <div className="code-pane__header">
                  <h2 className="text-heading-md">개선 코드</h2>
                 {analyzed && improvableRatio !== null && (
                  <Badge variant="neutral">개선 가능률 {improvableRatio.toFixed(1)}%</Badge>
                  )}
                </div>
                <div className="code-pane__body">
                  {improvedCode ? (
                    <pre className="code-view">{improvedCode}</pre>
                  ) : (
                    <div className="code-view code-view--empty">
                      {analyzed ? '개선점이 발견되지 않았습니다.' : '분석하기를 실행하면 개선된 코드가 표시됩니다.'}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {detectError && (
            <div className="ui-banner ui-banner--error">
              <Icon name="close" size={16} /> {detectError}
            </div>
          )}

          <div className="analyze-actions" style={pushed ? { flexDirection: 'column' } : undefined}>
            {!pushed && (
              analyzing ? (
                <>
                  <span className="ui-spinner" aria-hidden="true" />
                  <Button variant="danger" onClick={handleStopAnalysis}>
                    분석 중지
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={handleAnalyze} disabled={!originalCode.trim()}>
                  분석하기
                </Button>
              )
            )}

            {analyzed && pushAnalysisId && branch && filePath && (
              <>
                <Button variant="primary" onClick={handlepush} disabled={pushing || pushed}>
                  {pushed ? '반영 완료 ✓' : pushing ? '반영 중 …' : 'GitHub에 Push'}
                </Button>
                {pushError && <span className="text-body-sm ui-banner--error">{pushError}</span>}

                {pushed && (
                  prUrl ? (
                    <Button variant="secondary" onClick={() => window.open(prUrl, '_blank', 'noopener,noreferrer')}>
                      GitHub에서 PR 확인
                    </Button>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
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
                    </>
                  )
                )}
              </>
            )}
          </div>

          {analyzed && (
            <div className="result-section">
              <div className="gr-page__header">
                <h2 className="text-heading-lg">분석 결과 및 설명</h2>
                {issueCount !== null && <span className="text-body-sm">총 {issueCount}건의 이슈가 발견되었습니다.</span>}
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
                {aiDetection && (
                  <Card className="result-card">
                    <div className="result-card__head">
                      <Icon name="bug" size={15} />
                      <Badge variant={aiDetection.hasVulnerability ? 'warning' : 'success'}>
                        {aiDetection.hasVulnerability ? `취약점 ${aiDetection.vulnerabilities.length}건` : '취약점 없음'}
                      </Badge>
                    </div>
                    {aiDetection.vulnerabilities.length > 0 ? (
                      aiDetection.vulnerabilities.map((v, i) => (
                        <p key={i} className="text-body-sm" style={{ marginTop: 4 }}>
                          <strong>{v.line}번째 줄</strong> — {v.message}
                        </p>
                      ))
                    ) : (
                      <p className="text-caption-md" style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                        semgrep 분석 결과 취약점이 발견되지 않았습니다.
                      </p>
                    )}
                  </Card>
                )}
              </div>
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

          {aiDetection && (
            <Card className="ai-detect-card">
              <div className="ai-detect-card__header">
                <div className="ai-detect-card__title">
                  <Icon name={aiDetection.isAiGenerated ? 'spark' : 'check'} size={18} />
                  <h2 className="text-heading-lg">
                    {aiDetection.isAiGenerated ? 'AI 생성 코드로 판별됨' : '사람이 작성한 코드로 판별됨'}
                  </h2>
                  {aiDetection.confidence !== null && (
                    <span className={`confidence-pill confidence-pill--${getConfidenceLevel(aiDetection.confidence)}`}>
                      AI가 작성했을 확률 : {Math.round(aiDetection.confidence)}%
                    </span>
                  )}
                  {detectElapsed !== null && (
                    <span className="ai-elapsed text-caption-md">
                      <Icon name="spark" size={12} /> {detectElapsed >= 1000 ? `${(detectElapsed / 1000).toFixed(2)}s` : `${detectElapsed}ms`}
                    </span>
                  )}
                </div>
              </div>

              {aiDetection.confidence !== null && aiDetection.confidence >= 70 && (
                <div className="ui-banner ui-banner--error confidence-warning">
                  <Icon name="bug" size={16} /> AI가 작성했을 가능성이 높은 코드입니다.
                </div>
              )}

            {aiDetection.reasons.length > 0 && (
              <ul className="ai-detect-card__reasons">
                {aiDetection.reasons.map((r, i) => (
                  <li key={i} className="text-body-sm">{r}</li>
                ))}
              </ul>
          )}

              {aiDetection.isAiGenerated && pushAnalysisId && (
                <div className="prompt-section">
                  <div className="prompt-section__header">
                    <Icon name="edit" size={16} />
                    <h3 className="text-heading-md">원본 프롬프트 재구성</h3>
                  </div>
                  <p className="text-body-sm prompt-section__desc">
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
                    <div className="prompt-result">
                      <div className="prompt-result__body">
                        <div className="prompt-result__header">
                          <span className="text-caption-md prompt-result__label">
                            발견된 문제가 반영된 개선된 프롬프트입니다.
                          </span>
                          <Button variant="ghost" size="sm" icon={<Icon name={reconstructCopied ? 'check' : 'upload'} size={14} />} onClick={handleCopyReconstructedPrompt}>
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
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
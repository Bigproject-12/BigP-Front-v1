import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

import { useRepos } from '../context/RepoContext';
// fetchBranches 함수 추가
import { fetchBranches, fetchRepoTree, fetchFileContent, fetchRepoBranches } from '../lib/github';

import { recommendPrompt } from '../lib/aiService';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import Modal from '../components/ui/Modal'
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
  const { confirm } = useConfirm();

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
  // 폴더/파일 검색어
  const [fileSearch, setFileSearch] = useState('');

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
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [prTitle, setPrTitle] = useState('');        // 사용자가 편집 중인 제목
  const [prBody, setPrBody] = useState('');          // 사용자가 편집 중인 설명
   const [isPrEditing, setIsPrEditing] = useState(false);  // 제목·설명 편집 모드 여부
  const [prBranches, setPrBranches] = useState([]);
  const [prBaseBranch, setPrBaseBranch] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fileInputRef = useRef(null);
  const prDefaultsRef = useRef({ title: '', body: '' });
  const originalTextareaRef = useRef(null);
  const originalLineCount = useMemo(
    () => (originalCode ? originalCode.split('\n').length : 1),
    [originalCode]
  );
  const improvedLineCount = useMemo(
    () => (improvedCode ? improvedCode.split('\n').length : 1),
    [improvedCode]
  );
  const prBodyLines = useMemo(                             // 설명을 줄 단위로 쪼개서 "앞 2줄 + …외 N건" 미리보기용 데이터
    () => (prBody ? prBody.split('\n').filter((l) => l.trim() !== '') : []),
    [prBody]
  );
  const prBodyPreview = prBodyLines.slice(0, 2);          // 접힘 상태에서 보여줄 2줄
  const prBodyRestCount = Math.max(prBodyLines.length - 2, 0); // 숨겨진 줄 수

  // 자동 생성 원본과 달라졌을 때만 「초기화」 노출
  const isPrDirty =
    prTitle !== prDefaultsRef.current.title || prBody !== prDefaultsRef.current.body;

  // 레포/브랜치/파일을 바꿀 때 이전 분석 결과(개선 코드, 이슈, push/PR 상태 등)를 모두 비움
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

  // 페이지가 일정 이상 스크롤되면 맨 위로 버튼 노출
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 내부 스크롤바 대신 페이지 스크롤을 쓰도록 입력창 높이를 내용에 맞춰 늘림
  useEffect(() => {
    const el = originalTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [originalCode]);

  // AI 감지 & 프롬프트 추천 상태
  const [aiDetection, setAiDetection] = useState(null);
  const [detectError, setDetectError] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [promptResult, setPromptResult] = useState(null);
  const [promptTab, setPromptTab] = useState('improve');
  const [recommending, setRecommending] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

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

  // 확장자 필터 + 검색어가 적용된 상태로 폴더별 그룹화 수행
  const groupedFiles = useMemo(() => {
    const keyword = fileSearch.trim().toLowerCase();
    return files.reduce((acc, path) => {
      const parts = path.split('/');
      const fileName = parts[parts.length - 1];
      const ext = fileName.includes('.') ? fileName.split('.').pop() : '기타';

      // 선택한 확장자와 일치하지 않으면 제외
      if (selectedExt && ext !== selectedExt) {
        return acc;
      }
      // 검색어가 파일명에 포함되지 않으면 제외 (폴더명 일치는 무시)
      if (keyword && !fileName.toLowerCase().includes(keyword)) {
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
  }, [files, selectedExt, fileSearch]);

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
    resetAnalysisOutput();
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

  // 👈 상단 탭 클릭 시 히스토리(RepoDetailPage)로 돌아가는 기능 추가
  const handleTopTabChange = async (key) => {
    if (key === 'history') {
      // 💡 코드가 입력되어 있거나, 이미 분석을 돌린 상태라면 경고창을 띄움
      if (originalCode.trim() || analyzed) {
        const confirmLeave = await confirm(
          "화면을 이동하면 현재 작업 중인 코드와 분석 결과가 초기화됩니다.\n히스토리로 이동하시겠습니까?",
          { title: '경고' }
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
    if (!(await confirm('개선된 코드를 GitHub에 반영(push)하시겠습니까? \n 실제 저장소의 파일이 수정됩니다.', { title: '경고', danger: true }))) return;
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
// 분석 결과를 바탕으로 PR 제목/설명 기본값을 만든다
  //    (추후 사용자 편집 기능을 붙이면 이 함수는 초기값 생성용으로만 남는다)
  const buildPrDefaults = () => {
    // 백엔드: filePath에서 마지막 '/' 뒤를 잘라내고, filePath가 null이면 "코드"
    const fileName = filePath
      ? filePath.substring(filePath.lastIndexOf('/') + 1)
      : (activeFileName || '코드');

    const countBy = (cat) => issues.filter((i) => i.category === cat).length;
    const security = countBy('SECURITY');
    const performance = countBy('PERFORMANCE');
    const total = issueCount ?? issues.length;

    const title = `GuardrAil: ${fileName} 코드 개선 (이슈 ${total}건)`;

    const body =
      `분석 결과: 총 ${total}건의 이슈 개선.\n\n` +
      `- 파일: \`${filePath}\`\n` +
      `- 보안 이슈: ${security}건\n` +
      `- 비효율 이슈: ${performance}건\n\n` +
      `분석 세부 내용은 분석 ID: ${pushAnalysisId}에서 확인 가능.`;

    return { title, body };
  };
  // "Pull Request 생성" 버튼 → 기본값을 세팅한 뒤 모달을 연다
  const openPrModal = () => {
    const defaults = buildPrDefaults();
    prDefaultsRef.current = defaults; // 초기화용 원본 보관
    setPrTitle(defaults.title);
    setPrBody(defaults.body);
    setIsPrEditing(false); // 항상 표시 모드로 시작
    setPrError('');
    setIsPrModalOpen(true);
  };

  // 사용자가 수정한 제목·설명을 자동 생성 원본으로 한 번에 되돌린다
  const handleResetPrAll = () => {
    setPrTitle(prDefaultsRef.current.title);
    setPrBody(prDefaultsRef.current.body);
  };
  // 편집 영역 바깥을 클릭하면 자동으로 표시 모드로 복귀
  // relatedTarget = 포커스를 새로 받는 요소. 그게 편집 영역 안이면 유지
  const handlePrEditBlur = (e) => {
    const next = e.relatedTarget;
    if (next && e.currentTarget.contains(next)) return; // 제목 ↔ 설명 이동은 유지
    setIsPrEditing(false);
  };

  const handleCreatePr = async () => {
    if (!pushAnalysisId) return;
    setCreatingPr(true);
    setPrError('');
    try {
      const result = await api.post(`/api/analysis/${pushAnalysisId}/pr`, {
        baseBranch: prBaseBranch,
        title: prTitle,
        body: prBody,
      });
      setPrUrl(result.prUrl);
      setIsPrModalOpen(false);   // 성공 시 모달 닫기
    } catch (e) {
      // 실패 시엔 모달을 열어둔 채 에러 표시 (브랜치 선택값 보존)
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
                    setFileSearch('');
                    setOriginalCode('');
                    resetAnalysisOutput();
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
                setFileSearch('');
                setOriginalCode('');
                resetAnalysisOutput();
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

          {/* 5. 파일 검색 (경로/파일명 기준) */}
          <div className="analyze-toolbar__field">
            <Input
              label="파일 검색"
              placeholder="파일명 또는 경로 검색"
              leftIcon={<Icon name="search" size={16} />}
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              disabled={!branch || analyzing}
            />
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
    <div
            className="analyze-toolbar"
            style={{
              justifyContent: 'flex-end',   // 모든 버튼을 오른쪽으로
              alignItems: 'center',
              minHeight: '40px',            // 버튼이 바뀌어도 높이 고정 → 레이아웃 시프트 방지
              marginBottom: 'var(--space-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              {/* 에러 메시지는 버튼 왼쪽에 나란히 */}
              {pushError && <span className="text-body-sm ui-banner--error">{pushError}</span>}

              {/* 1) 분석 중 → 중지 버튼 + 스피너 */}
              {analyzing ? (
                <>
                  <span className="ui-spinner" aria-hidden="true" />
                  <Button variant="danger" onClick={handleStopAnalysis}>
                    분석 중지
                  </Button>
                </>
              ) : prUrl ? (
                /* 4) PR 생성 완료 → GitHub에서 확인 */
                <Button
                  variant="secondary"
                  onClick={() => window.open(prUrl, '_blank', 'noopener,noreferrer')}
                >
                  GitHub에서 PR 확인
                </Button>
              ) : pushed ? (
                /* 3) Push 완료 → PR 생성 */
                <Button variant="primary" onClick={openPrModal}>
                  Pull Request 생성
                </Button>
              ) : analyzed && pushAnalysisId && branch && filePath ? (
                /* 2) 분석 완료 & GitHub 파일 → Push */
                <Button variant="primary" onClick={handlepush} disabled={pushing}>
                  {pushing ? '반영 중 …' : 'GitHub에 Push'}
                </Button>
              ) : (
                /* 0) 기본 → 분석하기 */
                <Button
                  variant="primary"
                  onClick={handleAnalyze}
                  disabled={!originalCode.trim()}
                >
                  분석하기
                </Button>
              )}
            </div>
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

          {!aiDetection && !detectError && (
            <Card className="ai-empty">
              <Icon name="spark" size={32} />
              <p className="text-body-sm">
                {analyzed ? 'AI 감지 정보가 없습니다.' : '코드 분석 탭에서 분석하기를 실행하면 AI 감지 결과가 표시됩니다.'}
              </p>
            </Card>
          )}

          {aiDetection && (
            <Card className="ai-detect-card">
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

                {pushAnalysisId && aiDetection.confidence !== null && aiDetection.confidence >= 30 && (
                <div
                  className="prompt-section"
                  style={!(aiDetection.confidence !== null && aiDetection.confidence >= 70) ? { borderTop: 'none', paddingTop: 0 } : undefined}
                >
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
              )}
            </Card>
          )}
        </>
      )}
{isPrModalOpen && (
        <Modal
          title="Pull Request 생성"
          onClose={() => setIsPrModalOpen(false)}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => setIsPrModalOpen(false)}
                disabled={creatingPr}          // 생성 중엔 닫지 못하게 막음
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleCreatePr}
                disabled={creatingPr || !prBaseBranch}
              >
                {creatingPr ? '생성 중…' : '생성'}
              </Button>
            </>
          }
        >
          <div className="pr-modal">
            {/* 브랜치 — GitHub Compare 스타일 (base ← compare) */}
            <div className="pr-modal__branch">
              <Icon name="compare" size={16} className="pr-modal__branch-icon" />
              <div className="pr-modal__branch-box">
                {/* base = 병합될 대상. 유일하게 편집 가능한 값 */}
                <span className="pr-modal__branch-key">base:</span>
                <Select value={prBaseBranch} onChange={(e) => setPrBaseBranch(e.target.value)}>
                  {prBranches.length === 0 && <option value="">브랜치 불러오는 중…</option>}
                  {prBranches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}{b.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </Select>

                {/* 화살표 방향: compare의 변경사항이 base로 흘러들어감 */}
                <span className="pr-modal__branch-arrow">←</span>

                {/* compare = 이미 push한 작업 브랜치. 고정값이라 텍스트로만 표시 */}
                <span className="pr-modal__branch-key">compare:</span>
                <span className="pr-modal__branch-name">{branch}</span>
              </div>
            </div>

            {/* 제목+설명 — 한 덩어리로 묶어 blur 감지 (내부 이동은 편집 유지) */}
            <div className="pr-modal__editable" onBlur={handlePrEditBlur}>

              {/* 제목 — 클릭하면 편집 진입 */}
              <div className="pr-modal__field-head">
                {isPrEditing ? (
                  <input
                    className="pr-modal__title-input"
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    placeholder="PR 제목을 입력하세요"
                    autoFocus
                  />
                ) : (
                  <h3
                    className="pr-modal__title pr-modal__title--clickable"
                    onClick={() => setIsPrEditing(true)}
                    title="클릭해서 수정"
                  >
                    {prTitle}
                  </h3>
                )}
                <div className="pr-modal__field-actions">
                  {isPrEditing ? (
                    <button
                      type="button"
                      className="pr-modal__reset"
                      // 포커스 이동을 막아야 blur로 편집이 닫히기 전에 onClick이 실행됨
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleResetPrAll}
                      disabled={!isPrDirty}
                      title="제목·설명을 자동 생성 내용으로 되돌립니다"
                      aria-label="제목·설명 초기화"
                    >
                      ↺
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pr-modal__more"
                      onClick={() => setIsPrEditing(true)}
                    >
                      편집
                    </button>
                  )}
                </div>
              </div>

              {/* 설명 — 편집 모드면 textarea, 아니면 2줄 미리보기(클릭 시 편집) */}
              <div className="pr-modal__body">
              {isPrEditing ? (
                <textarea
                  className="pr-modal__body-textarea"
                  value={prBody}
                  onChange={(e) => setPrBody(e.target.value)}
                  rows={10}
                  placeholder="PR 설명을 입력하세요"
                />
              ) : (
                <div
                  className="pr-modal__body-preview"
                  onClick={() => setIsPrEditing(true)}
                  title="클릭해서 수정"
                >
                  {prBodyPreview.map((line, i) => (
                    <div key={i} className="pr-modal__body-line">{line}</div>
                  ))}
                  {prBodyRestCount > 0 && (
                    <span className="pr-modal__rest">…외 {prBodyRestCount}줄</span>
                  )}
                </div>
              )}
            </div>

            </div>

            <p className="pr-modal__hint">
              제목과 내용은 자동 생성됩니다. 편집을 눌러 수정할 수 있습니다.
            </p>

            {prError && <div className="ui-banner ui-banner--error">{prError}</div>}
          </div>
        </Modal>
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
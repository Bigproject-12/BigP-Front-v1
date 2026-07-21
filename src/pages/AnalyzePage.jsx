import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';

import { useRepos } from '../context/RepoContext';
// fetchBranches 함수 추가
import { fetchBranches, fetchRepoTree, fetchFileContent,
 GITHUB_TOKEN_KEY, GITHUB_ORG_KEY
 } from '../lib/github';

import { detectAiGeneratedCode, recommendPrompt } from '../lib/aiService';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import DiffViewer from '../components/ui/DiffViewer';
import { Tabs } from '../components/ui/Tabs';
import './AnalyzePage.css';

const TYPE_VARIANT = { 보안: 'warning', 비효율: 'info', 이슈: 'neutral' };

function genericMockAnalyze(code) {
  const improvedCode = code
    .split('\n')
    .map((line) => line.replace(/\bvar\s+/g, 'const ').replace(/\s+$/g, ''))
    .join('\n');
  return {
    improvedCode,
    issues: [
      {
        type: '이슈',
        severity: 'low',
        description: '입력된 코드에서 등록된 히스토리와 일치하는 항목을 찾지 못해 일반 규칙만 적용되었습니다.',
        reason: 'var 선언을 const로 교체하고 후행 공백을 정리하는 기본 스타일 규칙을 적용했습니다.',
      },
    ],
  };
}

export default function AnalyzePage() {
  const { params, navigate } = useRouter();
  const { user } = useAuth();

  const isGithubLinked=Boolean(localStorage.getItem(GITHUB_TOKEN_KEY)
  &&localStorage.getItem(GITHUB_ORG_KEY));

  const { repos, reposLoading } = useRepos();
  const [branches, setBranches] = useState([]);
  const [files, setFiles] = useState([]);

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
  const [improvementRate, setImprovementRate] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
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

  const handleAnalyze = async () => {
    if (!originalCode.trim()) return;
    setAnalyzing(true);
    setCompareMode(false);
    setAiDetection(null);
    setDetectError('');
    setPromptResult(null);
    try {
      const [mocked, detection] = await Promise.all([
        new Promise((resolve) => setTimeout(() => resolve(genericMockAnalyze(originalCode)), 700)),
        detectAiGeneratedCode(originalCode).then((r) => r.result).catch(() => null),
      ]);
      setImprovedCode(mocked.improvedCode);
      setIssues(mocked.issues);
      setIssueCount(mocked.issues.length);
      setImprovementRate(12);
      setAiDetection(detection);
      setAnalyzed(true);
    } finally {
      setAnalyzing(false);
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
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">코드 분석</h1>
          <span className="text-body-sm">
            {user ? `${user.name}님의 저장소 코드를 분석하고 개선안을 확인하세요.` : ''}
          </span>
        </div>
      </div>

      {/* 파일 선택 툴바 — 탭 공통 영역 */}
      <Card>
        <div className="analyze-toolbar">

          {!isGithubLinked ? (
            <div style={{display: 'flex', alignItems: 'center', gap:'12px', flex:1}}>
            <span className="text-body-sm" style={{color: 'var(--text-muted)'}}>
              GitHub가 아직 연동되지 않았습니다. 코드를 불러오려면 연동을 진행해 주세요.
            </span>
            <Button variant="primary" size="sm" onClick={goToMyPage}>
              GitHub 연동하러 가기
            </Button>
            </div>
          ):(
          <>

          {/*1. 레포지토리 선택*/}
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
              }}
            >
              <option value="">{reposLoading ? 'Repository 목록을 불러오는 중입니다.' : '레포 선택'}</option>
              {!reposLoading && repos.map((r) => (
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
              disabled={!repoId}
            >
              <option value="">브랜치 선택</option>
              {branches.map((b)=>(
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
          </div>

          {/* 3. 폴더/파일 선택 */}
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
              disabled={!branch}
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

          {/* 4. 확장자 필터 선택 (맨 끝으로 이동) */}
          <div className="analyze-toolbar__field" style={{ maxWidth: '140px' }}>
            <label>확장자 필터</label>
            <Select
              value={selectedExt}
              onChange={(e) => {
                setSelectedExt(e.target.value);
                setFilePath(''); // 필터 변경 시 선택된 파일 초기화
              }}
              disabled={!branch}
            >
              <option value="">모든 확장자</option>
              {availableExtensions.map((ext) => (
                <option key={ext} value={ext}>*.{ext}</option>
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
          <Button variant="secondary" size="sm" icon={<Icon name="upload" size={15} />} onClick={() => fileInputRef.current?.click()}>
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
                  {analyzed && improvementRate !== null && <Badge variant="success">개선율 {improvementRate}%</Badge>}
                </div>
                <div className="code-pane__body">
                  {improvedCode ? (
                    <pre className="code-view">{improvedCode}</pre>
                  ) : (
                    <div className="code-view code-view--empty">분석하기를 실행하면 개선된 코드가 표시됩니다.</div>
                  )}
                </div>
              </Card>
            </div>
          )}

          <div className="analyze-actions">
            <Button variant="primary" onClick={handleAnalyze} disabled={analyzing || !originalCode.trim()}>
              {analyzing ? '분석 중…' : '분석하기'}
            </Button>
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
                  <Badge variant={aiDetection.isAiGenerated ? 'warning' : 'success'}>
                    확신도 {aiDetection.confidence}%
                  </Badge>
                  {detectElapsed !== null && (
                    <span className="ai-elapsed text-caption-md">
                      <Icon name="spark" size={12} /> {detectElapsed >= 1000 ? `${(detectElapsed / 1000).toFixed(2)}s` : `${detectElapsed}ms`}
                    </span>
                  )}
                </div>
              </div>

              <ul className="ai-detect-card__reasons">
                {aiDetection.reasons.map((r, i) => (
                  <li key={i} className="text-body-sm">{r}</li>
                ))}
              </ul>

              {aiDetection.isAiGenerated && (
                <div className="prompt-section">
                  <div className="prompt-section__header">
                    <Icon name="edit" size={16} />
                    <h3 className="text-heading-md">더 나은 프롬프트 추천</h3>
                  </div>
                  <p className="text-body-sm prompt-section__desc">
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
                    <div className="prompt-result">
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
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}
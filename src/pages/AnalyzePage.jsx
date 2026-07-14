import { useEffect, useRef, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
// fetchBranches 함수 추가 
import { fetchOrgRepos, fetchBranches, fetchRepoTree, fetchFileContent,
 GITHUB_TOKEN_KEY, GITHUB_ORG_KEY 
 } from '../lib/github';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
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

  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);// [추가] 브랜치 목록 상태
  const [files, setFiles] = useState([]);

  const [repoId, setRepoId] = useState('');
  const [branch, setBranch] = useState('');// [추가] 선택된 브랜치 상태
  const [filePath, setFilePath] = useState('');
  const [fileNameOverride, setFileNameOverride] = useState('');

  const [originalCode, setOriginalCode] = useState('');
  const [improvedCode, setImprovedCode] = useState('');
  const [issues, setIssues] = useState([]);
  const [issueCount, setIssueCount] = useState(null);
  const [improvementRate, setImprovementRate] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const fileInputRef = useRef(null);

  //1. 초기 레포지토리 목록 로드 
  useEffect(() => {
    if (isGithubLinked){
    fetchOrgRepos().then(setRepos).catch(() => setRepos([]));
    }
  }, [isGithubLinked]);

  const selectedRepo = repos.find((r) => String(r.id) === repoId);

  // 2. [수정] 레포지토리가 선택되면 브랜치 목록 로드
  useEffect(() => {
    if (!selectedRepo) { 
      setBranches([]); 
      return; 
    }
    fetchBranches(selectedRepo.fullName).then(setBranches).catch(() => setBranches([]));
  }, [repoId, selectedRepo?.fullName]);

  // 3. [추가] 브랜치가 선택되면 해당 브랜치의 파일 트리 로드
  useEffect(()=>{
    if (!selectedRepo || !branch){
      setFiles([]);
      return;
    }
    // fetchRepoTree에 선택된 브랜치 이름을 함께 전달합니다.
    fetchRepoTree(selectedRepo.fullName,branch).then(setFiles).catch(()=>setFiles([]));
  }, [branch, selectedRepo?.fullName]);

  useEffect(() => {
    const initialRepoId = params.get('repoId');
    if (initialRepoId) setRepoId(initialRepoId);
  }, [params]);

  // 파일 선택 시 GitHub에서 내용 로드(branch 파라미터 추가)
  useEffect(() => {
    if (!filePath || !selectedRepo|| !branch) return;
    setFileNameOverride('');
    setAnalyzed(false);
    setCompareMode(false);
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
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!originalCode.trim()) return;
    setAnalyzing(true);
    setCompareMode(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const mocked = genericMockAnalyze(originalCode);
      setImprovedCode(mocked.improvedCode);
      setIssues(mocked.issues);
      setIssueCount(mocked.issues.length);
      setImprovementRate(12);
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

      {compareMode && (
        <div className="ui-banner ui-banner--success">
          <Icon name="compare" size={16} /> 히스토리에서 불러온 분석 결과입니다. 원본과 개선 코드를 비교해보세요.
        </div>
      )}

      <Card>
        <div className="analyze-toolbar">

          {/*0. 깃허브 연동되지 않았을 경우*/}

          {!isGithubLinked ? (
            <div style={{display: 'flex', alighitems: 'center', gap:'12px', flex:1}}>
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
                setBranch(''); //레포지토리가 바뀌면 브랜치 초기화
                setFilePath('');
                setFileNameOverride('');
                setCompareMode(false);
                setAnalyzed(false);
              }}
            >
              <option value="">레포 선택</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>

          {/* 2. [추가] 브랜치 선택 */}
          <div className="analyze-toolbar__field">
            <label>Branch</label>
            <Select
              value={branch}
              onChange={(e)=>{
                setBranch(e.target.value);
                setFilePath(''); //브랜치 변경 시 파일 선택 초기화 
                setFileNameOverride('');
                setCompareMode(false);
                setAnalyzed(false);
              }}
              disabled={!repoId}
              >
                <option value="">브랜치 선택</option>
                {branches.map((b)=>(
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
          </div>
          
          {/*폴더/파일 선택*/}

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
              {fileNameOverride && (
                <option value="custom" disabled>
                  {fileNameOverride}
                </option>
              )}
              {files.map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
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
                  <strong>개선 사유</strong>
                  <br />
                  {issue.reason}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

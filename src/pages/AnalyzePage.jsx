import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
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
  const { params } = useRouter();
  const { user } = useAuth();

  const [repos, setRepos] = useState([]);
  const [files, setFiles] = useState([]);
  const [repoId, setRepoId] = useState('');
  const [fileId, setFileId] = useState('');
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

  useEffect(() => {
    api.get('/repos').then(setRepos).catch(() => setRepos([]));
  }, []);

  useEffect(() => {
    if (!repoId) {
      setFiles([]);
      return;
    }
    api
      .get(`/repoFiles?repoId=${repoId}`)
      .then(setFiles)
      .catch(() => setFiles([]));
  }, [repoId]);

  // Bootstrap from query params: ?analysisId=X (compare view) or ?repoId=X (jump from repo history)
  useEffect(() => {
    const analysisId = params.get('analysisId');
    const initialRepoId = params.get('repoId');

    if (analysisId) {
      api.get(`/analyses/${analysisId}`).then((a) => {
        setRepoId(String(a.repoId));
        setFileNameOverride(a.fileName);
        setOriginalCode(a.originalCode);
        setImprovedCode(a.improvedCode);
        setIssues(a.issues);
        setIssueCount(a.issueCount);
        setImprovementRate(a.improvementRate);
        setAnalyzed(true);
        setCompareMode(true);
      });
    } else if (initialRepoId) {
      setRepoId(initialRepoId);
    }
  }, [params]);

  const selectedFile = useMemo(
    () => files.find((f) => String(f.id) === fileId),
    [files, fileId],
  );
  const activeFileName = fileNameOverride || (selectedFile ? selectedFile.path.split('/').pop() : '');

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalCode(String(reader.result || ''));
      setFileNameOverride(file.name);
      setFileId('');
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
      let result = null;
      if (repoId && activeFileName) {
        const matches = await api.get(
          `/analyses?repoId=${repoId}&fileName=${encodeURIComponent(activeFileName)}`,
        );
        if (matches && matches.length > 0) result = matches[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (result) {
        setImprovedCode(result.improvedCode);
        setIssues(result.issues);
        setIssueCount(result.issueCount);
        setImprovementRate(result.improvementRate);
      } else {
        const mocked = genericMockAnalyze(originalCode);
        setImprovedCode(mocked.improvedCode);
        setIssues(mocked.issues);
        setIssueCount(mocked.issues.length);
        setImprovementRate(12);
      }
      setAnalyzed(true);
    } finally {
      setAnalyzing(false);
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
          <div className="analyze-toolbar__field">
            <label>Repository</label>
            <Select
              value={repoId}
              onChange={(e) => {
                setRepoId(e.target.value);
                setFileId('');
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
          <div className="analyze-toolbar__field">
            <label>폴더 / 파일</label>
            <Select
              value={fileId || (fileNameOverride ? 'custom' : '')}
              onChange={(e) => {
                setFileId(e.target.value);
                setFileNameOverride('');
                setCompareMode(false);
                setAnalyzed(false);
              }}
              disabled={!repoId}
            >
              <option value="">파일 선택</option>
              {fileNameOverride && (
                <option value="custom" disabled>
                  {fileNameOverride}
                </option>
              )}
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path}
                </option>
              ))}
            </Select>
          </div>
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

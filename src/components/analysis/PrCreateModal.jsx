import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchRepoBranches } from '../../lib/github';
import { api } from '../../lib/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Icon from '../icons/Icon';
import '../../pages/AnalyzePage.css';

// 백엔드 에러 코드를 사용자 언어로 다시 쓴다.
// 백엔드 기본 문구는 원인을 그대로 옮긴 편이라, 무엇을 하면 되는지가 드러나지 않는다.
// (백엔드 수정이 어려운 단계라 프론트에서 바꾼다. code는 api.js가 error.code로 실어 보낸다.)
const ERROR_MESSAGES = {
  GITHUB_PR_ALREADY_OPEN:
    '같은 브랜치로 열려 있는 Pull Request가 이미 있습니다. 새로 만드는 대신 GitHub에서 기존 PR을 확인해 주세요.',
  GITHUB_PR_ALREADY_CREATED:
    '이 분석 결과로 만든 Pull Request가 이미 있습니다. GitHub에서 기존 PR을 확인해 주세요.',
  GITHUB_PR_SAME_BRANCH:
    '분석한 브랜치와 대상(base) 브랜치가 같습니다. 위에서 다른 base 브랜치를 선택해 주세요.',
  GITHUB_PR_HEAD_MISMATCH:
    'Push 이후 브랜치가 변경되어 Pull Request를 만들 수 없습니다. 최신 코드로 다시 분석한 뒤 시도해 주세요.',
  ANALYSIS_NOT_COMPLETED: '완료된 분석만 Pull Request로 만들 수 있습니다.',
};

// 코드 분석 페이지의 "Pull Request 생성" 모달과 동일한 흐름(base 브랜치 선택 + 제목/설명 편집)을
// 단건/다건 분석 어디서든(예: Push 탭의 단일·다중 push) 재사용하기 위한 컴포넌트.
// analysisIds가 1개면 단건 PR API, 여러 개면 배치 PR API를 호출한다.
export default function PrCreateModal({ analysisIds, repoId, headBranch, defaultTitle, defaultBody, onClose, onCreated }) {
  const [branches, setBranches] = useState([]);
  const [baseBranch, setBaseBranch] = useState('');
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [isEditing, setIsEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const defaultsRef = useRef({ title: defaultTitle, body: defaultBody });

  useEffect(() => {
    fetchRepoBranches(Number(repoId))
      .then((list) => {
        setBranches(list ?? []);
        const def = (list ?? []).find((b) => b.isDefault);
        if (def) setBaseBranch(def.name);
      })
      .catch(() => setBranches([]));
  }, [repoId]);

  const bodyLines = useMemo(
    () => (body ? body.split('\n').filter((l) => l.trim() !== '') : []),
    [body]
  );
  const bodyPreview = bodyLines.slice(0, 2);
  const bodyRestCount = Math.max(bodyLines.length - 2, 0);
  const isDirty = title !== defaultsRef.current.title || body !== defaultsRef.current.body;

  const handleResetAll = () => {
    setTitle(defaultsRef.current.title);
    setBody(defaultsRef.current.body);
  };

  const handleEditBlur = (e) => {
    const next = e.relatedTarget;
    if (next && e.currentTarget.contains(next)) return;
    setIsEditing(false);
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      // 단건은 { prUrl }, 배치는 { pullRequestUrl } 로 키 이름이 다르다.
      const isSingle = analysisIds.length === 1;
      const result = isSingle
        ? await api.post(`/api/analysis/${analysisIds[0]}/pr`, { baseBranch, title, body })
        : await api.post('/api/analysis/batch-pull-request', {
            analysisIds,
            baseBranch,
            title,
            body,
          });

      // 두 키를 모두 받아본다. 응답 형태가 바뀌어도 링크를 놓치지 않기 위함.
      const prUrl = result?.prUrl ?? result?.pullRequestUrl ?? result?.url;
      if (!prUrl) {
        // URL을 못 찾으면 조용히 닫지 말고 알린다.
        // 그냥 닫히면 "PR은 만들어졌는데 링크가 안 뜬다"로 보여 원인 파악이 어렵다.
        setError(
          'PR 요청은 성공했지만 응답에서 PR 주소를 찾지 못했습니다. ' +
            `응답 내용: ${JSON.stringify(result)}`
        );
        return;
      }
      onCreated(prUrl);
    } catch (e) {
      setError(ERROR_MESSAGES[e.code] ?? e.message ?? 'PR 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      title="Pull Request 생성"
      onClose={onClose}
      actions={
        <>
          {/* onMouseDown 기본동작(포커스 이동)을 막는다.
              이걸 막지 않으면 편집 중에 이 버튼을 누를 때 textarea에서 포커스가 빠져
              아래 handleEditBlur가 먼저 실행되고, 편집 화면이 미리보기로 되돌아갔다가
              클릭이 처리되면서 '입력한 내용이 사라졌다가 닫히는' 것처럼 보인다.
              (입력값 자체는 title/body state에 남아 있어 실제로는 그대로 전송된다) */}
          <Button
            variant="secondary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClose}
            disabled={creating}
          >
            취소
          </Button>
          <Button
            variant="primary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCreate}
            disabled={creating || !baseBranch}
          >
            {creating ? '생성 중…' : '생성'}
          </Button>
        </>
      }
    >
      <div className="pr-modal">
        <div className="pr-modal__branch">
          <Icon name="compare" size={16} className="pr-modal__branch-icon" />
          <div className="pr-modal__branch-box">
            <span className="pr-modal__branch-key">base:</span>
            <Select value={baseBranch} onChange={(e) => setBaseBranch(e.target.value)}>
              {branches.length === 0 && <option value="">브랜치 불러오는 중…</option>}
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}{b.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </Select>
            <span className="pr-modal__branch-arrow">←</span>
            <span className="pr-modal__branch-key">compare:</span>
            <span className="pr-modal__branch-name">{headBranch}</span>
          </div>
        </div>

        <div className="pr-modal__editable" onBlur={handleEditBlur}>
          <div className="pr-modal__field-head">
            {isEditing ? (
              <input
                className="pr-modal__title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="PR 제목을 입력하세요"
                autoFocus
              />
            ) : (
              <h3
                className="pr-modal__title pr-modal__title--clickable"
                onClick={() => setIsEditing(true)}
                title="클릭해서 수정"
              >
                {title}
              </h3>
            )}
            <div className="pr-modal__field-actions">
              {isEditing ? (
                <button
                  type="button"
                  className="pr-modal__reset"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleResetAll}
                  disabled={!isDirty}
                  title="제목·설명을 자동 생성 내용으로 되돌립니다"
                  aria-label="제목·설명 초기화"
                >
                  ↺
                </button>
              ) : (
                <button type="button" className="pr-modal__more" onClick={() => setIsEditing(true)}>
                  편집
                </button>
              )}
            </div>
          </div>

          <div className="pr-modal__body">
            {isEditing ? (
              <textarea
                className="pr-modal__body-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="PR 설명을 입력하세요"
              />
            ) : (
              <div className="pr-modal__body-preview" onClick={() => setIsEditing(true)} title="클릭해서 수정">
                {bodyPreview.map((line, i) => (
                  <div key={i} className="pr-modal__body-line">{line}</div>
                ))}
                {bodyRestCount > 0 && <span className="pr-modal__rest">…외 {bodyRestCount}줄</span>}
              </div>
            )}
          </div>
        </div>

        <p className="pr-modal__hint">
          제목과 내용은 자동 생성됩니다. 편집을 눌러 수정할 수 있습니다.
        </p>

        {error && <div className="ui-banner ui-banner--error">{error}</div>}
      </div>
    </Modal>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchRepoBranches } from '../../lib/github';
import { api } from '../../lib/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Icon from '../icons/Icon';
import '../../pages/AnalyzePage.css';

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
      if (analysisIds.length === 1) {
        const result = await api.post(`/api/analysis/${analysisIds[0]}/pr`, {
          baseBranch,
          title,
          body,
        });
        onCreated(result.prUrl);
      } else {
        const result = await api.post('/api/analysis/batch-pull-request', {
          analysisIds,
          baseBranch,
          title,
          body,
        });
        onCreated(result.pullRequestUrl);
      }
    } catch (e) {
      setError(e.message || 'PR 생성에 실패했습니다.');
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
          <Button variant="secondary" onClick={onClose} disabled={creating}>
            취소
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={creating || !baseBranch}>
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

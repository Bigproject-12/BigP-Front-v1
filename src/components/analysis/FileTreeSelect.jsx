import { useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import FileTypeIcon from '../icons/FileTypeIcon';
import './FileTreeSelect.css';

// 파일 경로 문자열 목록으로부터 중첩 폴더 트리를 만든다.
function buildTree(paths) {
  const root = { name: '', path: '', children: new Map(), isFile: false };
  for (const path of paths) {
    const parts = path.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const folderPath = node.path ? `${node.path}/${part}` : part;
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, path: folderPath, children: new Map(), isFile: false });
      }
      node = node.children.get(part);
    }
    const leafName = parts[parts.length - 1];
    node.children.set(leafName, { name: leafName, path, children: new Map(), isFile: true });
  }
  return root;
}

function sortedChildren(node) {
  return Array.from(node.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1; // 폴더 먼저
    return a.name.localeCompare(b.name);
  });
}

function TreeNode({ node, depth, expanded, toggle, selectedPath, onSelect }) {
  if (node.isFile) {
    return (
      <button
        type="button"
        className={`fts-row fts-row--file ${node.path === selectedPath ? 'fts-row--active' : ''}`}
        style={{ paddingLeft: depth * 16 + 30 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelect(node.path)}
      >
        <FileTypeIcon name={node.name} size={14} className="fts-row__icon" />
        <span className="fts-row__name">{node.name}</span>
      </button>
    );
  }

  const isOpen = expanded.has(node.path);
  return (
    <div>
      <button
        type="button"
        className="fts-row fts-row--folder"
        style={{ paddingLeft: depth * 16 }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggle(node.path)}
      >
        <Icon name="chevronRight" size={13} className={`fts-chevron ${isOpen ? 'fts-chevron--open' : ''}`} />
        <Icon name="folder" size={14} className="fts-row__icon" filled={isOpen} />
        <span className="fts-row__name">{node.name}</span>
      </button>
      {isOpen && (
        <div>
          {sortedChildren(node).map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 코드 분석 탭의 "폴더 / 파일" 선택용 트리 드롭다운.
// AnalyzePage 전용 컴포넌트로, MySpace의 ProjectTree와는 별개로 동작한다.
export default function FileTreeSelect({
  files,
  value,
  onSelect,
  onCreateNew,
  disabled = false,
  placeholder = '파일 선택',
  fallbackLabel = '',
}) {
  const [open, setOpen] = useState(false);
  const tree = useMemo(() => buildTree(files), [files]);
  const topLevel = useMemo(() => sortedChildren(tree), [tree]);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = (path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectedName = value ? value.split('/').pop() : fallbackLabel;

  return (
    <div className="fts" onBlur={() => setTimeout(() => setOpen(false), 120)}>
      <button
        type="button"
        className="fts-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {selectedName ? (
          <span className="fts-trigger__selected">
            <FileTypeIcon name={selectedName} size={14} />
            {selectedName}
          </span>
        ) : (
          <span className="fts-trigger__placeholder">{placeholder}</span>
        )}
        <Icon name="chevronDown" size={14} className="fts-trigger__caret" />
      </button>

      {open && (
        <div className="fts-panel">
          <button
            type="button"
            className="fts-row fts-row--new"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onCreateNew();
              setOpen(false);
            }}
          >
            <Icon name="plus" size={14} />
            <span>새 파일 추가</span>
          </button>
          <div className="fts-tree">
            {topLevel.length === 0 ? (
              <div className="fts-empty">파일이 없습니다.</div>
            ) : (
              topLevel.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  toggle={toggle}
                  selectedPath={value}
                  onSelect={(path) => {
                    onSelect(path);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

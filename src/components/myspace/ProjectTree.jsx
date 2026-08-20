import { useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import FileTypeIcon from '../icons/FileTypeIcon';
import './ProjectTree.css';

// 파일 경로 목록으로부터 중첩 폴더 트리를 만든다.
function buildTree(files) {
  const root = { name: '', path: '', children: new Map(), file: null };
  for (const f of files) {
    const parts = f.path.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const path = node.path ? `${node.path}/${part}` : part;
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, path, children: new Map(), file: null });
      }
      node = node.children.get(part);
    }
    const leafName = parts[parts.length - 1];
    node.children.set(leafName, { name: leafName, path: f.path, children: new Map(), file: f });
  }
  return root;
}

// 폴더 노드의 하위 전체 이슈 건수를 합산한다.
function folderIssueCount(node) {
  let total = 0;
  for (const child of node.children.values()) {
    total += child.file ? (child.file.totalIssueCount || 0) : folderIssueCount(child);
  }
  return total;
}

function sortedChildren(node) {
  return Array.from(node.children.values()).sort((a, b) => {
    if (!!a.file !== !!b.file) return a.file ? 1 : -1; // 폴더 먼저
    return a.name.localeCompare(b.name);
  });
}

function TreeNode({ node, depth, expanded, toggle }) {
  if (node.file) {
    const f = node.file;
    const hasIssues = f.analyzed && f.totalIssueCount > 0;
    return (
      <div className="ptree-row ptree-row--file" style={{ paddingLeft: depth * 18 + 28 }}>
        <FileTypeIcon name={node.name} size={14} className="ptree-row__icon" />
        <span className="ptree-row__name">{node.name}</span>
        {hasIssues && (
          <span className={`ptree-badge ${f.criticalIssueCount > 0 || f.highIssueCount > 0 ? 'ptree-badge--high' : 'ptree-badge--low'}`}>
            {f.totalIssueCount}건
          </span>
        )}
      </div>
    );
  }

  const isOpen = expanded.has(node.path);
  const count = folderIssueCount(node);

  return (
    <div>
      <button
        type="button"
        className="ptree-row ptree-row--folder"
        style={{ paddingLeft: depth * 18 }}
        onClick={() => toggle(node.path)}
      >
        <Icon name="chevronRight" size={13} className={`ptree-chevron ${isOpen ? 'ptree-chevron--open' : ''}`} />
        <Icon name="folder" size={14} className="ptree-row__icon" filled={isOpen} />
        <span className="ptree-row__name">{node.name}</span>
        {count > 0 && <span className="ptree-badge ptree-badge--high">{count}건</span>}
      </button>
      {isOpen && (
        <div className="ptree-children">
          {sortedChildren(node).map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} expanded={expanded} toggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectTree({ files }) {
  const tree = useMemo(() => buildTree(files), [files]);
  const topLevel = useMemo(() => sortedChildren(tree), [tree]);
  const [expanded, setExpanded] = useState(
    () => new Set(topLevel.filter((n) => !n.file).map((n) => n.path)),
  );

  const toggle = (path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (files.length === 0) {
    return <div className="ui-empty">파일이 없습니다.</div>;
  }

  return (
    <div className="ptree">
      {topLevel.map((node) => (
        <TreeNode key={node.path} node={node} depth={0} expanded={expanded} toggle={toggle} />
      ))}
    </div>
  );
}

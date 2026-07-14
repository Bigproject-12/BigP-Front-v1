import { useMemo } from 'react';
import { diffLines } from 'diff';

/**
 * 원본 코드와 개선 코드를 나란히 비교합니다.
 * 삭제된 줄은 왼쪽 빨간 배경, 추가된 줄은 오른쪽 초록 배경으로 표시합니다.
 */
export default function DiffViewer({ original, improved }) {
  const { leftLines, rightLines } = useMemo(() => {
    const hunks = diffLines(original, improved);
    const left = [];
    const right = [];

    let i = 0;
    while (i < hunks.length) {
      const hunk = hunks[i];

      if (hunk.removed && hunks[i + 1]?.added) {
        // 변경된 블록: 삭제 + 추가를 나란히 배치
        const removedLines = hunk.value.replace(/\n$/, '').split('\n');
        const addedLines = hunks[i + 1].value.replace(/\n$/, '').split('\n');
        const maxLen = Math.max(removedLines.length, addedLines.length);

        for (let j = 0; j < maxLen; j++) {
          left.push({ text: removedLines[j] ?? '', type: 'removed' });
          right.push({ text: addedLines[j] ?? '', type: 'added' });
        }
        i += 2;
      } else if (hunk.removed) {
        // 삭제만: 오른쪽은 빈 줄
        const lines = hunk.value.replace(/\n$/, '').split('\n');
        lines.forEach((text) => {
          left.push({ text, type: 'removed' });
          right.push({ text: '', type: 'empty' });
        });
        i++;
      } else if (hunk.added) {
        // 추가만: 왼쪽은 빈 줄
        const lines = hunk.value.replace(/\n$/, '').split('\n');
        lines.forEach((text) => {
          left.push({ text: '', type: 'empty' });
          right.push({ text, type: 'added' });
        });
        i++;
      } else {
        // 변경 없는 공통 줄
        const lines = hunk.value.replace(/\n$/, '').split('\n');
        lines.forEach((text) => {
          left.push({ text, type: 'context' });
          right.push({ text, type: 'context' });
        });
        i++;
      }
    }

    return { leftLines: left, rightLines: right };
  }, [original, improved]);

  const lineCount = leftLines.length;

  return (
    <div className="diff-viewer">
      <div className="diff-pane diff-pane--left">
        <div className="diff-pane__label">원본</div>
        <div className="diff-pane__code">
          {leftLines.map((line, idx) => (
            <div key={idx} className={`diff-line diff-line--${line.type}`}>
              <span className="diff-line__num">{line.type !== 'empty' ? idx + 1 : ''}</span>
              <span className="diff-line__marker">{line.type === 'removed' ? '-' : ' '}</span>
              <span className="diff-line__text">{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="diff-pane diff-pane--right">
        <div className="diff-pane__label">개선</div>
        <div className="diff-pane__code">
          {rightLines.map((line, idx) => (
            <div key={idx} className={`diff-line diff-line--${line.type}`}>
              <span className="diff-line__num">{line.type !== 'empty' ? idx + 1 : ''}</span>
              <span className="diff-line__marker">{line.type === 'added' ? '+' : ' '}</span>
              <span className="diff-line__text">{line.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

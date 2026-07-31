import { useMemo } from 'react';
import { diffLines } from 'diff';

/**
 * 원본 코드와 개선 코드를 나란히 비교합니다.
 * 삭제된 줄은 왼쪽 빨간 배경, 추가된 줄은 오른쪽 초록 배경으로 표시합니다.
 * 좌우를 한 줄씩 같은 grid row에 그려서, 긴 줄이 줄바꿈되어도 양쪽 줄번호가 어긋나지 않게 합니다.
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

    // 같은 행에서는 원본/개선 양쪽에 같은 번호가 보이도록 병합 배열 위치를 그대로 씀
    left.forEach((line, idx) => { line.num = idx + 1; });
    right.forEach((line, idx) => { line.num = idx + 1; });

    return { leftLines: left, rightLines: right };
  }, [original, improved]);

  return (
    <div className="diff-compare">
      <div className="diff-compare__labels">
        <div className="diff-pane__label">원본</div>
        <div className="diff-pane__label">개선</div>
      </div>
      <div className="diff-grid">
        {leftLines.map((line, idx) => {
          const r = rightLines[idx];
          return (
            <div className="diff-row" key={idx}>
              <span className={`diff-cell diff-cell--num diff-line--${line.type}`}>{line.num ?? ''}</span>
              <span className={`diff-cell diff-cell--marker diff-line--${line.type}`}>{line.type === 'removed' ? '-' : ' '}</span>
              <span className={`diff-cell diff-cell--text diff-cell--divider diff-line--${line.type}`}>{line.text}</span>
              <span className={`diff-cell diff-cell--num diff-line--${r.type}`}>{r.num ?? ''}</span>
              <span className={`diff-cell diff-cell--marker diff-line--${r.type}`}>{r.type === 'added' ? '+' : ' '}</span>
              <span className={`diff-cell diff-cell--text diff-line--${r.type}`}>{r.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { diffLines } from 'diff';
import Button from './Button';
import Icon from '../icons/Icon';

/**
 * 원본 코드와 개선 코드를 나란히 비교합니다.
 * 좌우 패널을 독립된 컨테이너로 분리하여 각 영역을 따로 드래그 선택할 수 있게 합니다.
 * 개선 코드 영역에 전체 복사 버튼을 추가합니다.
 */
export default function DiffViewer({ original, improved }) {
  const [copied, setCopied] = useState(false);

  const { leftLines, rightLines } = useMemo(() => {
    const hunks = diffLines(original, improved);
    const left = [];
    const right = [];

    let i = 0;
    while (i < hunks.length) {
      const hunk = hunks[i];

      if (hunk.removed && hunks[i + 1]?.added) {
        const removedLines = hunk.value.replace(/\n$/, '').split('\n');
        const addedLines = hunks[i + 1].value.replace(/\n$/, '').split('\n');
        const maxLen = Math.max(removedLines.length, addedLines.length);

        for (let j = 0; j < maxLen; j++) {
          left.push({ text: removedLines[j] ?? '', type: 'removed' });
          right.push({ text: addedLines[j] ?? '', type: 'added' });
        }
        i += 2;
      } else if (hunk.removed) {
        const lines = hunk.value.replace(/\n$/, '').split('\n');
        lines.forEach((text) => {
          left.push({ text, type: 'removed' });
          right.push({ text: '', type: 'empty' });
        });
        i++;
      } else if (hunk.added) {
        const lines = hunk.value.replace(/\n$/, '').split('\n');
        lines.forEach((text) => {
          left.push({ text: '', type: 'empty' });
          right.push({ text, type: 'added' });
        });
        i++;
      } else {
        const lines = hunk.value.replace(/\n$/, '').split('\n');
        lines.forEach((text) => {
          left.push({ text, type: 'context' });
          right.push({ text, type: 'context' });
        });
        i++;
      }
    }

    left.forEach((line, idx) => { line.num = idx + 1; });
    right.forEach((line, idx) => { line.num = idx + 1; });

    return { leftLines: left, rightLines: right };
  }, [original, improved]);

  // 개선 코드 전체 복사 핸들러
  const handleCopyImprovedCode = () => {
    navigator.clipboard.writeText(improved).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="diff-compare">
      <div className="diff-compare__labels">
        <div className="diff-pane__label">원본</div>
        <div className="diff-pane__label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>개선</span>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Icon name={copied ? 'check' : 'copy'} size={20} />} 
            onClick={handleCopyImprovedCode}
          >
            {copied ? '복사됨' : '복사'}
          </Button>
        </div>
      </div>
      
      {/* 좌우 패널을 각각 독립된 DOM 구조로 분리하여 개별 드래그 선택 가능 */}
      <div className="diff-viewer-split">
        {/* 왼쪽 (원본) 패널 */}
        <div className="diff-pane diff-pane--left">
          <div className="diff-subgrid">
            {leftLines.map((line, idx) => (
              <div className="diff-row" key={idx}>
                <span className={`diff-cell diff-cell--num diff-line--${line.type}`}>{line.num ?? ''}</span>
                <span className={`diff-cell diff-cell--marker diff-line--${line.type}`}>{line.type === 'removed' ? '-' : ' '}</span>
                <span className={`diff-cell diff-cell--text diff-line--${line.type}`}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽 (개선) 패널 */}
        <div className="diff-pane diff-pane--right">
          <div className="diff-subgrid">
            {rightLines.map((line, idx) => (
              <div className="diff-row" key={idx}>
                <span className={`diff-cell diff-cell--num diff-line--${line.type}`}>{line.num ?? ''}</span>
                <span className={`diff-cell diff-cell--marker diff-line--${line.type}`}>{line.type === 'added' ? '+' : ' '}</span>
                <span className={`diff-cell diff-cell--text diff-line--${line.type}`}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
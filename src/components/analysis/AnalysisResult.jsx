import { useState } from 'react';
import './AnalysisResult.css';

/* ── 카테고리 메타 ───────────────────────────────── */
const CATEGORY_META = {
  SECURITY:    { label: '보안 취약점', color: '#E11D48' },
  PERFORMANCE: { label: '코드 비효율', color: '#F59E0B' },
  STYLE:       { label: '코드 스타일', color: '#0EA5E9' },
  ETC:         { label: '기타',        color: '#64748B' },
};
const CATEGORY_ORDER = ['SECURITY', 'PERFORMANCE', 'STYLE', 'ETC'];

/* ── 규칙 ID → 한 줄 제목 사전 ────────────────────────
   rule_id는 Semgrep이 주는 결정론적 값이라 사전 매핑이 가능합니다.
   LLM이 title 필드를 주기 전까지 쓰는 임시 방편.          */
const RULE_TITLE = {
  'formatted-sql-string': 'SQL 문에 문자열을 직접 조합함',
  'hardcoded-credential': '인증 정보가 코드에 하드코딩됨',
  'sqli':                 '사용자 입력이 SQL 문에 연결됨',
  'command-injection':    '외부 입력이 시스템 명령에 전달됨',
  'path-traversal':       '파일 경로에 검증 없는 입력이 사용됨',
  'insecure-hash':        '취약한 해시 알고리즘을 사용함',
  'md5-used-as-password': 'MD5를 비밀번호 해시로 사용함',
  'weak-crypto':          '안전하지 않은 암호 방식을 사용함',
};

function stripLinePrefix(message = '') {
  return message.replace(/^\s*\d+\s*번째\s*줄\s*[—\-–:]\s*/, '').trim();
}

/* 제목 결정 우선순위: ① 백엔드 title ② 규칙 사전 ③ 설명 첫 문장 */
function resolveTitle(issue) {
  if (issue.title) return issue.title;

  const ruleId = issue.ruleId ?? '';
  const hit = Object.keys(RULE_TITLE).find((k) => ruleId.includes(k));
  if (hit) return RULE_TITLE[hit];

  const body = stripLinePrefix(issue.message);
  const first = body.split(/(?<=다)\.\s|\.\s/)[0] ?? body;
  return first.length > 38 ? first.slice(0, 38) + '…' : first || '설명 없음';
}

/* AI 확률을 한 문장으로 해석 */
function aiVerdict(p) {
  if (p >= 70) return 'AI 생성 가능성이 높습니다. 리뷰를 꼼꼼히 하세요.';
  if (p >= 40) return '일부 구간에서 AI 생성 패턴이 보입니다.';
  return '사람이 작성한 코드에 가깝습니다.';
}

/* ── 이슈 한 줄 ──────────────────────────────────── */
function FindingRow({ issue, color, isOpen, onToggle, onIssueClick }) {
  const canJump = !!onIssueClick && (issue.line || issue.functionName);

  return (
    <div className={`ar-row ${isOpen ? 'is-open' : ''}`}>
      {/* grid로 열 폭 고정 → 모든 행이 같은 x좌표에 정렬 */}
      <button className="ar-row-head" onClick={onToggle} type="button">
        <span className="ar-dot" style={{ background: color }} />
        <span className="ar-line">{issue.line ? `L${issue.line}` : '—'}</span>
        <span className="ar-title">{resolveTitle(issue)}</span>
        <span className="ar-caret">▾</span>
      </button>

      {isOpen && (
        <div className="ar-row-body">
          <p className="ar-desc">{stripLinePrefix(issue.message)}</p>
          {issue.ruleId && (
            <p className="ar-rule">탐지 규칙 <code>{issue.ruleId}</code></p>
          )}
          {canJump && (
            <button className="ar-jump" type="button" onClick={() => onIssueClick(issue)}>
              코드에서 보기 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 카테고리 그룹 ───────────────────────────────── */
function FindingGroup({ category, items, openKey, setOpenKey, onIssueClick }) {
  const meta = CATEGORY_META[category];

  return (
    <section className="ar-group" style={{ '--group-color': meta.color }}>
      <header className="ar-group-head">
        <h4>{meta.label}</h4>
        <span className="ar-count">{items.length}</span>
      </header>

      <div className="ar-rows">
        {items.map((issue, idx) => {
          const key = `${category}-${idx}`;
          return (
            <FindingRow
              key={key}
              issue={issue}
              color={meta.color}
              isOpen={openKey === key}
              // 같은 행 재클릭 → 접힘, 다른 행 클릭 → 그 행만 펼침
              onToggle={() => setOpenKey(openKey === key ? null : key)}
              onIssueClick={onIssueClick}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ── 메인 컴포넌트 ───────────────────────────────── */
export default function AnalysisResult({
  issues = [],
  onIssueClick,
  aiProbability = null,   // null이면 오른쪽 영역이 통째로 안 나옴
}) {
  const [openKey, setOpenKey] = useState(undefined);

  const groups = CATEGORY_ORDER
    .map((cat) => ({
      cat,
      items: issues.filter(
        (i) => (CATEGORY_META[i.category] ? i.category : 'ETC') === cat
      ),
    }))
    .filter((g) => g.items.length > 0);

  const firstKey = groups.length ? `${groups[0].cat}-0` : null;
  const effectiveKey = openKey === undefined ? firstKey : openKey;

  return (
    <div className="ar-wrap">
      {/* ── 종합 요약 카드 ── */}
      <div className="ar-summary">
        <div className="ar-summary-left">
          <div className="ar-total">
            <strong>{issues.length}</strong>
            <span>건의 이슈</span>
          </div>
          <div className="ar-chips">
            {groups.length > 0 ? (
              groups.map((g) => (
                <span
                  key={g.cat}
                  className="ar-chip"
                  style={{ '--chip-color': CATEGORY_META[g.cat].color }}
                >
                  {CATEGORY_META[g.cat].label} {g.items.length}
                </span>
              ))
            ) : (
              <span className="ar-chip ar-chip--clean">이슈 없음</span>
            )}
          </div>
        </div>

        {aiProbability != null && (
          <>
            <div className="ar-divider" />
            <div className="ar-summary-right">
              <div className="ar-ai-label">AI 생성 확률</div>
              <div className="ar-ai-value">{Math.round(aiProbability)}%</div>
              <div className="ar-gauge">
                <div className="ar-gauge-fill" style={{ width: `${aiProbability}%` }} />
              </div>
              <div className="ar-ai-verdict">{aiVerdict(aiProbability)}</div>
            </div>
          </>
        )}
      </div>

      {/* ── 개별 이슈 ── */}
      {groups.length === 0 ? (
        <div className="ar-empty">발견된 보안 취약점이나 비효율 요소가 없습니다.</div>
      ) : (
        groups.map((g) => (
          <FindingGroup
            key={g.cat}
            category={g.cat}
            items={g.items}
            openKey={effectiveKey}
            setOpenKey={setOpenKey}
            onIssueClick={onIssueClick}
          />
        ))
      )}
    </div>
  );
}
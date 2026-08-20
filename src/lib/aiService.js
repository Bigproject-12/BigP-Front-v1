/**
 * AI 기능 서비스 레이어
 *
 * 현재는 mock 데이터를 반환합니다.
 * 백엔드 연결 시 USE_MOCK을 false로 바꾸고 각 함수의 fetch 주석을 활성화하세요.
 *
 * 예상 백엔드 엔드포인트:
 *   POST /api/ai/detect   — AI 생성 코드 판별
 *   POST /api/ai/prompt   — 프롬프트 추천
 */

const USE_MOCK = false;

// 서버가 2개인 경우 각각 URL을 지정하세요.
// 같은 서버라면 BACKEND_BASE만 사용하고 AI_BASE를 동일하게 맞추면 됩니다.
const BACKEND_BASE = import.meta.env.VITE_API_BASE; // 백엔드 서버 (인증, 데이터 등)
const AI_BASE = 'http://localhost:8000';      // AI 모델 서버 (HuggingFace 등)

// ─── mock 데이터 ────────────────────────────────────────────────────────────

const MOCK_DETECT_AI = {
  isAiGenerated: true,
  confidence: 87,
  reasons: [
    '들여쓰기와 코드 구조가 지나치게 균일합니다.',
    '변수명이 설명적이고 패턴이 일관됩니다 (e.g. result, index, callback).',
    '주석 스타일이 AI 생성 코드에서 자주 보이는 형태입니다.',
    '엣지 케이스 처리 로직이 교과서적으로 완전합니다.',
  ],
};

const MOCK_DETECT_HUMAN = {
  isAiGenerated: false,
  confidence: 91,
  reasons: [
    '불규칙한 들여쓰기와 임시 변수명(tmp, xxx)이 사용되었습니다.',
    '일부 엣지 케이스가 처리되지 않은 채로 남아있습니다.',
    '개발 과정의 흔적(주석 처리된 코드, TODO 등)이 보입니다.',
  ],
};

const MOCK_PROMPT_RESULT = {
  // 기존 AI 생성 코드를 개선할 때 쓸 프롬프트
  improve: {
    prompt:
      '아래 코드를 개선해주세요. 요구사항:\n' +
      '1. 가독성을 높이고 변수명을 더 명확하게 바꿔주세요.\n' +
      '2. null / undefined / 빈 배열 등 엣지 케이스를 처리해주세요.\n' +
      '3. 중복 로직이 있다면 재사용 가능한 함수로 분리해주세요.\n' +
      '4. 성능 병목이 보이면 개선해주세요.\n' +
      '5. 수정한 부분마다 한 줄 주석으로 이유를 달아주세요.',
    explanation:
      '입력된 코드에서 반복 패턴과 처리되지 않은 엣지 케이스가 감지되었습니다. ' +
      '개선 목표를 구체적으로 나열하면 AI가 임의로 변경하는 것을 방지하고, ' +
      '주석 요청을 포함해 결과물을 쉽게 검토할 수 있습니다.',
  },
  // 같은 기능을 처음부터 다시 생성할 때 쓸 프롬프트
  generate: {
    prompt:
      '다음 기능을 구현하는 코드를 작성해주세요.\n\n' +
      '[기능 설명]\n' +
      '• 입력된 userId를 받아 데이터베이스에서 사용자 정보를 조회하고 반환하는 함수\n\n' +
      '[요구사항]\n' +
      '1. async/await 패턴을 사용하고 콜백은 쓰지 마세요.\n' +
      '2. SQL 인젝션을 방지하는 파라미터 바인딩을 사용해주세요.\n' +
      '3. 사용자가 없을 경우 null을 반환하고, DB 오류는 throw해주세요.\n' +
      '4. TypeScript 타입 또는 JSDoc으로 입출력 타입을 명시해주세요.\n' +
      '5. 단위 테스트 코드도 함께 작성해주세요.',
    explanation:
      '기존 코드가 콜백 패턴과 SQL 인젝션 취약점을 가지고 있어, ' +
      '같은 기능을 더 안전하고 현대적인 방식으로 처음부터 작성하도록 유도했습니다. ' +
      '타입 명시와 테스트 요청을 포함해 품질 높은 결과물을 얻을 수 있습니다.',
  },
};

// ─── 타이밍 헬퍼 ────────────────────────────────────────────────────────────

/**
 * fn 실행 시간을 측정해 { result, elapsedMs } 형태로 반환합니다.
 * 실제 모델 연결 후 네트워크 왕복 + 추론 시간을 그대로 측정합니다.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ result: T, elapsedMs: number }>}
 */
async function withTiming(fn) {
  const start = performance.now();
  const result = await fn();
  const elapsedMs = Math.round(performance.now() - start);
  return { result, elapsedMs };
}

// ─── 서비스 함수 ─────────────────────────────────────────────────────────────

/**
 * AI 생성 코드 여부를 판별합니다.
 * @param {string} code
 * @returns {Promise<{ result: {isAiGenerated: boolean, confidence: number, reasons: string[]}, elapsedMs: number }>}
 */
export async function detectAiGeneratedCode(code) {
  return withTiming(async () => {
    if (USE_MOCK) {
      await delay(900);
      return code.length > 100 ? MOCK_DETECT_AI : MOCK_DETECT_HUMAN;
    }

    const res = await fetch(`${AI_BASE}/api/ai/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code_content: code }),
    });
    if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
    const data = await res.json();
    const aiProb = Math.round(data.ai_probability);
    return {
      isAiGenerated: data.is_ai_generated,
      confidence: data.is_ai_generated ? aiProb : 100 - aiProb,
      reasons: [],
      hasVulnerability: data.has_vulnerability,
      vulnerabilities: data.vulnerabilities ?? [],
    };
  });
}

/**
 * 코드 개선용·신규 생성용 프롬프트를 각각 추천합니다.
 * @param {string} code - 원본 코드
 * @param {string} userPrompt - 사용자가 입력한 방향 (없으면 빈 문자열)
 * @returns {Promise<{ result: { improve: {...}, generate: {...} }, elapsedMs: number }>}
 */
export async function recommendPrompt(code, userPrompt = '') {
  return withTiming(async () => {
    if (USE_MOCK) {
      await delay(1200);
      return MOCK_PROMPT_RESULT;
    }

    // ── 백엔드 연결 시 아래 코드를 활성화 ──
    // 프롬프트 추천도 AI 모델 서버로 요청합니다.
    // const res = await fetch(`${AI_BASE}/prompt`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ code, userPrompt }),
    // });
    // if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
    // return res.json();
    // 응답 형태: { improve: { prompt, explanation }, generate: { prompt, explanation } }

    // 백엔드 서버를 거쳐야 하는 경우 (인증 토큰 검증 등) 아래처럼 변경하세요.
    // const res = await fetch(`${BACKEND_BASE}/api/ai/prompt`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    //   body: JSON.stringify({ code, userPrompt }),
    // });
    // if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
    // return res.json();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

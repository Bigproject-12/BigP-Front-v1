// 백엔드 PasswordPolicy(com.aivle.bigproject.common.PasswordPolicy)와 동일한 규칙.
// 회원가입/비밀번호 변경이 이 값을 공유한다.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 18;
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S+$/;

export const PASSWORD_LENGTH_MESSAGE = '비밀번호는 8자 이상 18자 이하여야 합니다.';
export const PASSWORD_PATTERN_MESSAGE = '비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.';
export const PASSWORD_HINT = '8자 이상 18자 이하, 영문 대문자·소문자·숫자·특수문자를 각각 하나 이상 포함해주세요.';

// 통과 시 null, 위반 시 에러 메시지를 반환한다.
export function validatePassword(password) {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return PASSWORD_LENGTH_MESSAGE;
  }
  if (!PASSWORD_RE.test(password)) {
    return PASSWORD_PATTERN_MESSAGE;
  }
  return null;
}

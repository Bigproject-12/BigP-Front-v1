import { api } from './api';

/**
 * 공지 목록 조회 (페이징 + 검색 + 정렬)
 * 응답: { content: [...], totalElements, totalPages, number, first, last }
 */
export function fetchNotices({ keyword = '', page = 0, size = 10, sort = 'createdAt,desc' } = {}) {
  // URLSearchParams: 객체를 "page=0&size=10" 형태 쿼리스트링으로 만들어줌
  const params = new URLSearchParams({ page, size, sort });
  if (keyword) params.append('keyword', keyword); // 검색어 있을 때만 추가

  return api.get(`/api/notices?${params.toString()}`);
}

/** 공지 상세 조회 */
export function fetchNotice(noticeId) {
  return api.get(`/api/notices/${noticeId}`);
}

/** 공지 등록 (ADMIN) — 201 반환 */
export function createNotice(data) {
  return api.post('/api/notices', data);
}

/**  공지 수정 (ADMIN) — 보낸 필드만 수정됨 */
export function updateNotice(noticeId, fields) {
  return api.patch(`/api/notices/${noticeId}`, fields);
}

/** 공지 삭제 (ADMIN) — 204라 응답 본문 없음, api.js가 null 반환 */
export function deleteNotice(noticeId) {
  return api.del(`/api/notices/${noticeId}`);
}
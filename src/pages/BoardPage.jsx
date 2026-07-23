import { useEffect, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../lib/format';
// api 직접 호출 대신 noticeApi 사용
import {
  fetchNotices, fetchNotice, createNotice, updateNotice, deleteNotice,
} from '../lib/noticeApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import './BoardPage.css';

// 서버가 지원하는 정렬 필드만 남김 (댓글순 제거)
const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: '최신순' },
  { value: 'viewCount,desc', label: '조회수순' },
];

const PAGE_SIZE = 10;

function BoardList({ isAdmin, navigate }) {
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('createdAt,desc');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setPage(0);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(0);
  };

  useEffect(() => {
    setLoading(true);
    fetchNotices({ keyword: query.trim(), page, size: PAGE_SIZE, sort })
      .then((data) => {
        setPosts(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [query, sort, page]);

  return (
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">공지사항</h1>
          <span className="text-body-sm">서비스 소식과 공지를 확인하세요.</span>
        </div>
      </div>

      {/* 🛠️ 검색바 툴바 영역에 관리자용 '게시글 작성' 버튼 통합 */}
      <div className="board-toolbar">
        <div className="board-toolbar__search">
          <Input
            placeholder="제목, 내용 검색"
            value={query}
            onChange={handleQueryChange}
            leftIcon={<Icon name="search" size={16} />}
          />
        </div>
        
        <div className="board-toolbar__right">
          <Select value={sort} onChange={handleSortChange}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>

          {isAdmin && (
            <Button variant="primary" icon={<Icon name="plus" size={16} />}
              onClick={() => navigate('?page=board&mode=write')}
              style={{ whiteSpace: 'nowrap' }}>
              게시글 작성
            </Button>
          )}
        </div>
      </div>

      <div className="board-list">
        {loading ? (
          <div className="text-body-sm">불러오는 중…</div>
        ) : posts.length === 0 ? (
          <div className="ui-empty">게시글이 없습니다.</div>
        ) : (
          posts.map((post) => (
            <Card
              key={post.boardId}
              className="board-card"
              onClick={() => navigate(`?page=board&postId=${post.boardId}`)}
            >
              <div className="board-card__main">
                <span className="board-card__title">
                  {post.isPinned && '📌 '}{post.title}
                </span>
                <div className="board-card__meta">
                  <span>{formatDateTime(post.createdAt)}</span>
                </div>
              </div>
              <div className="board-card__stats">
                <span className="board-card__stat">
                  <Icon name="eye" size={14} /> {post.viewCount}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 페이지가 2개 이상일 때만 페이징 노출 */}
      {totalPages > 1 && (
        <div className="board-write-cta" style={{ gap: 12 }}>
          <Button variant="secondary" disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}>이전</Button>
          <span className="text-body-sm" style={{ alignSelf: 'center' }}>
            {page + 1} / {totalPages}
          </span>
          <Button variant="secondary" disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}>다음</Button>
        </div>
      )}
    </>
  );
}

function BoardDetail({ postId, isAdmin, navigate }) {
  const [post, setPost] = useState(null);

  useEffect(() => {
    fetchNotice(postId).then(setPost);
    // 조회수 증가는 서버가 처리하므로 PATCH 불필요 → viewedRef도 삭제됨
  }, [postId]);

  const handleDelete = async () => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
    await deleteNotice(postId);
    navigate('?page=board');
  };

  if (!post) return <div className="text-body-sm">불러오는 중…</div>;

  return (
    <>
      <div className="gr-page__header">
        <Button variant="ghost"
          icon={<Icon name="chevronRight" size={14} style={{ transform: 'rotate(180deg)' }} />}
          onClick={() => navigate('?page=board')}>
          목록으로
        </Button>
      </div>

      <Card>
        <div className="board-detail__head">
          <h1 className="text-heading-xl">{post.isPinned && '📌 '}{post.title}</h1>
          <div className="board-detail__meta">
            <span>{formatDateTime(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
          </div>
        </div>
        <p className="board-detail__body">{post.content}</p>

        {isAdmin && (
          <div className="board-detail__actions">
            <Button variant="secondary" icon={<Icon name="edit" size={14} />}
              onClick={() => navigate(`?page=board&postId=${postId}&mode=edit`)}>
              수정
            </Button>
            <Button variant="danger" icon={<Icon name="trash" size={14} />}
              onClick={handleDelete}>
              삭제
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}

function BoardEditor({ postId, navigate }) {
  const isEdit = Boolean(postId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      fetchNotice(postId).then((post) => {
        setTitle(post.title);
        setContent(post.content);
        setIsPinned(post.isPinned);
        setLoading(false);
      });
    }
  }, [isEdit, postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }
    if (title.length > 255) {          // 서버 @Size 제약과 맞춤
      setError('제목은 255자를 넘을 수 없습니다.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateNotice(postId, { title, content, isPinned });
        navigate(`?page=board&postId=${postId}`);
      } else {
        // 작성자는 서버가 JWT에서 추출하므로 보내지 않음
        const created = await createNotice({ title, content, isPinned });
        navigate(`?page=board&postId=${created.boardId}`);   // id → boardId
      }
    } catch (err) {
      setError(err.message);          // 실패 시 저장 버튼이 계속 잠기지 않도록
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="gr-page__header">
        <h1 className="text-display-md">{isEdit ? '공지 수정' : '공지 작성'}</h1>
      </div>
      <Card>
        {loading ? (
          <div className="text-body-sm">불러오는 중…</div>
        ) : (
          <form className="board-editor" onSubmit={handleSubmit}>
            <Input label="제목" value={title} maxLength={255}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요" />
            <div className="ui-field">
              <label className="ui-field__label">내용</label>
              <textarea className="board-editor__textarea" value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력해주세요" />
            </div>
            <label className="ui-field" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)} />
              <span className="text-body-sm">상단 고정</span>
            </label>
            {error && <div className="ui-banner ui-banner--error">{error}</div>}
            <div className="board-detail__actions">
              <Button type="button" variant="secondary"
                onClick={() => navigate(isEdit ? `?page=board&postId=${postId}` : '?page=board')}>
                취소
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}

export default function BoardPage() {
  const { params, navigate } = useRouter();
  const { user } = useAuth();
  // ⚠️ 서버 role이 'ADMIN' 대문자이므로 대소문자 무시 비교
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const postId = params.get('postId');
  const mode = params.get('mode');

  if (mode === 'write' && isAdmin) return <BoardEditor navigate={navigate} />;
  if (mode === 'edit' && postId && isAdmin) return <BoardEditor postId={postId} navigate={navigate} />;
  if (postId) return <BoardDetail postId={postId} isAdmin={isAdmin} navigate={navigate} />;
  return <BoardList isAdmin={isAdmin} navigate={navigate} />;
}
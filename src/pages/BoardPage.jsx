import { useEffect, useRef, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import './BoardPage.css';

const SORT_OPTIONS = [
  { value: 'createdAt', label: '최신순' },
  { value: 'views', label: '조회수순' },
  { value: 'commentsCount', label: '댓글순' },
];

function BoardList({ isAdmin, navigate }) {
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('createdAt');

  useEffect(() => {
    const q = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : '';
    api
      .get(`/posts?_sort=${sort}&_order=desc${q}`)
      .then(setPosts)
      .catch(() => setPosts([]));
  }, [query, sort]);

  return (
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">게시판</h1>
          <span className="text-body-sm">공지사항과 서비스 소식을 확인하세요.</span>
        </div>
      </div>

      <div className="board-toolbar">
        <div className="board-toolbar__search">
          <Input
            placeholder="제목, 작성자, 내용 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Icon name="search" size={16} />}
          />
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="board-list">
        {posts.length === 0 ? (
          <div className="ui-empty">게시글이 없습니다.</div>
        ) : (
          posts.map((post) => (
            <Card
              key={post.id}
              className="board-card"
              onClick={() => navigate(`?page=board&postId=${post.id}`)}
            >
              <div className="board-card__main">
                <span className="board-card__title">{post.title}</span>
                <div className="board-card__meta">
                  <span>{post.author}</span>
                  <span>{formatDateTime(post.createdAt)}</span>
                </div>
              </div>
              <div className="board-card__stats">
                <span className="board-card__stat">
                  <Icon name="board" size={14} /> {post.commentsCount}
                </span>
                <span className="board-card__stat">
                  <Icon name="eye" size={14} /> {post.views}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {isAdmin && (
        <div className="board-write-cta">
          <Button variant="primary" icon={<Icon name="plus" size={16} />} onClick={() => navigate('?page=board&mode=write')}>
            게시글 작성
          </Button>
        </div>
      )}
    </>
  );
}

function BoardDetail({ postId, isAdmin, navigate }) {
  const [post, setPost] = useState(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    viewedRef.current = false;
  }, [postId]);

  useEffect(() => {
    api.get(`/posts/${postId}`).then((data) => {
      setPost(data);
      if (!viewedRef.current) {
        viewedRef.current = true;
        api.patch(`/posts/${postId}`, { views: data.views + 1 }).catch(() => {});
      }
    });
  }, [postId]);

  const handleDelete = async () => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
    await api.del(`/posts/${postId}`);
    navigate('?page=board');
  };

  if (!post) return <div className="text-body-sm">불러오는 중…</div>;

  return (
    <>
      <div className="gr-page__header">
        <Button variant="ghost" icon={<Icon name="chevronRight" size={14} style={{ transform: 'rotate(180deg)' }} />} onClick={() => navigate('?page=board')}>
          목록으로
        </Button>
      </div>

      <Card>
        <div className="board-detail__head">
          <h1 className="text-heading-xl">{post.title}</h1>
          <div className="board-detail__meta">
            <span>{post.author}</span>
            <span>{formatDateTime(post.createdAt)}</span>
            <span>조회 {post.views}</span>
          </div>
        </div>
        <p className="board-detail__body">{post.content}</p>

        {isAdmin && (
          <div className="board-detail__actions">
            <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => navigate('?page=board&mode=write')}>
              새 글 작성
            </Button>
            <Button variant="secondary" icon={<Icon name="edit" size={14} />} onClick={() => navigate(`?page=board&postId=${postId}&mode=edit`)}>
              수정
            </Button>
            <Button variant="danger" icon={<Icon name="trash" size={14} />} onClick={handleDelete}>
              삭제
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}

function BoardEditor({ postId, user, navigate }) {
  const isEdit = Boolean(postId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/posts/${postId}`).then((post) => {
        setTitle(post.title);
        setContent(post.content);
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
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/posts/${postId}`, { title, content });
        navigate(`?page=board&postId=${postId}`);
      } else {
        const created = await api.post('/posts', {
          title,
          content,
          author: user.name,
          authorId: user.id,
          createdAt: new Date().toISOString(),
          views: 0,
          commentsCount: 0,
        });
        navigate(`?page=board&postId=${created.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="gr-page__header">
        <h1 className="text-display-md">{isEdit ? '게시글 수정' : '게시글 작성'}</h1>
      </div>
      <Card>
        {loading ? (
          <div className="text-body-sm">불러오는 중…</div>
        ) : (
        <form className="board-editor" onSubmit={handleSubmit}>
          <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력해주세요" />
          <div className="ui-field">
            <label className="ui-field__label">내용</label>
            <textarea
              className="board-editor__textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력해주세요"
            />
          </div>
          {error && <div className="ui-banner ui-banner--error">{error}</div>}
          <div className="board-detail__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit ? `?page=board&postId=${postId}` : '?page=board')}
            >
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
  const isAdmin = user?.role === 'admin';
  const postId = params.get('postId');
  const mode = params.get('mode');

  if (mode === 'write' && isAdmin) {
    return <BoardEditor user={user} navigate={navigate} />;
  }
  if (mode === 'edit' && postId && isAdmin) {
    return <BoardEditor postId={postId} user={user} navigate={navigate} />;
  }
  if (postId) {
    return <BoardDetail postId={postId} isAdmin={isAdmin} navigate={navigate} />;
  }
  return <BoardList isAdmin={isAdmin} navigate={navigate} />;
}

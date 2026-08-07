import { api } from './api';

const BASE = 'https://api.github.com';

function headers() {
  return { Accept: 'application/vnd.github+json' };
}

function mapRepo(r) {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? '',
    private: r.private,
    language: r.language ?? '기타',
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
    stars: r.stargazers_count,
    forks: r.forks_count,
  };
}

// PR 생성용 브랜치 목록 (백엔드를 통해 가져옴, isDefault 포함)
export async function fetchRepoBranches(repoId) {
  return api.get(`/api/repos/${repoId}/branches`);
}

// 파일 트리 + 파일별 이슈/품질점수 배지 (백엔드를 통해 가져옴)
export async function fetchRepoTreeWithIssues(repoId, branch, issuesOnly = false) {
  return api.get(`/api/repos/${repoId}/tree?branch=${encodeURIComponent(branch)}&issuesOnly=${issuesOnly}`);
}

export async function fetchRepoFileContent(repoId, path, branch) {
  const data = await api.get(`/api/repos/${repoId}/content?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`);
  return data.content;
}

export async function fetchRepo(id) {
  const res = await fetch(`${BASE}/repositories/${id}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  return mapRepo(await res.json());
}

export async function fetchOrgRepos() {
  const data = await api.get('/api/repos');
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.repoUrl?.replace('https://github.com/', '') ?? '',
    description: '',
    private: Boolean(r.isPrivate),
    language: r.language ?? '기타',
    organization: r.organization ?? '',
    updatedAt: r.lastUpdated,
    htmlUrl: r.repoUrl,
    stars: 0,
    forks: 0,
  }));
}
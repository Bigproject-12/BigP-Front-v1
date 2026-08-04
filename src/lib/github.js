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
    language: r.language ?? '코드 중복성',
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
    stars: r.stargazers_count,
    forks: r.forks_count,
  };
}

// Repository의 브랜치 목록을 가져옵니다.(추가)
export async function fetchBranches(fullName) {
  const res = await fetch(`${BASE}/repos/${fullName}/branches`, { headers: headers() });

  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);

  const data = await res.json();
  // data는 [{ name: 'main', commit: {...} }, { name: 'dev', ... }] 형태이므로 이름만 추출
  return data.map((branch) => branch.name);
}

// PR 생성용 브랜치 목록 (우리 백엔드를 통해 가져옴, isDefault 포함)
export async function fetchRepoBranches(repoId) {
  return api.get(`/api/repos/${repoId}/branches`);
}

// 파일 트리 + 파일별 이슈/품질점수 배지 (우리 백엔드를 통해 가져옴)
export async function fetchRepoTreeWithIssues(repoId, branch, issuesOnly = false) {
  return api.get(`/api/repos/${repoId}/tree?branch=${encodeURIComponent(branch)}&issuesOnly=${issuesOnly}`);
}

// 기존 fetchRepoTree 함수를 아래와 같이 수정하세요.
export async function fetchRepoTree(fullName, branch = 'HEAD') {
  // HEAD 대신 ${encodeURIComponent(branch)}를 사용하여 특정 브랜치 트리를 가져옴
  const res = await fetch(`${BASE}/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: headers() });
  
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  const data = await res.json();
  return (data.tree ?? []).filter((n) => n.type === 'blob').map((n) => n.path);
}

// 특정 브랜치의 파일 내용을 가져옵니다.
export async function fetchFileContent(fullName, path, branch = 'HEAD') {
  // 주소 끝에 ?ref= 옵션을 주어 특정 브랜치(또는 커밋 해시)를 지정합니다.
  const url = `${BASE}/repos/${fullName}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: headers() });
  
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  
  const data = await res.json();
  const binary = atob(data.content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
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
    language: r.language ?? '코드 중복성',
    organization: r.organization ?? '',
    updatedAt: r.lastUpdated,
    htmlUrl: r.repoUrl,
    stars: 0,
    forks: 0,
  }));
}
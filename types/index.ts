/** GitHub 레포 설정 */
export interface RepoConfig {
  owner: string;
  repo: string;
  branch: string;
  basePath: string; // "tmp" 폴더 경로
}

/** GitHub API에서 반환하는 파일/디렉토리 정보 */
export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  content?: string; // base64 encoded
  download_url: string | null;
}

/** 카테고리 (tmp/ 아래 폴더) */
export interface Category {
  name: string;
  path: string;
}

/** 초안 파일 */
export interface Draft {
  name: string;
  path: string;
  sha: string;
  content: string;
  category: string;
  lastModified?: string;
}

/** 로컬에 임시 저장된 초안 (오프라인용) */
export interface LocalDraft {
  id: string;
  title: string;
  content: string;
  category: string;
  /** GitHub에 존재하는 파일의 sha (새 파일이면 undefined) */
  remoteSha?: string;
  /** 마지막 수정 시간 */
  updatedAt: string;
  /** GitHub에 동기화 되었는지 */
  synced: boolean;
}

/** 앱 전체 설정 */
export interface AppSettings {
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
  /** GitHub Personal Access Token */
  token: string;
}

export const DEFAULT_SETTINGS: Omit<AppSettings, "token"> = {
  owner: "ssongjay",
  repo: "few-words-blog",
  branch: "main",
  basePath: "tmp",
};

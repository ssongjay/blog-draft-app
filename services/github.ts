import { GitHubContent, Category, Draft } from "../types";

const API_BASE = "https://api.github.com";

interface GitHubServiceConfig {
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
  token: string;
}

/**
 * GitHub REST API를 사용한 파일 관리 서비스
 *
 * 주요 API:
 * - GET /repos/{owner}/{repo}/contents/{path} : 파일/폴더 조회
 * - PUT /repos/{owner}/{repo}/contents/{path} : 파일 생성/수정 (자동 커밋)
 * - DELETE /repos/{owner}/{repo}/contents/{path} : 파일 삭제
 */
class GitHubService {
  private config: GitHubServiceConfig | null = null;

  /** 서비스 초기화 */
  configure(config: GitHubServiceConfig) {
    this.config = config;
  }

  /** 설정 확인 */
  get isConfigured(): boolean {
    return this.config !== null && this.config.token.length > 0;
  }

  /** API 요청 헬퍼 */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.config) {
      throw new Error("GitHub 서비스가 초기화되지 않았습니다. 설정을 확인하세요.");
    }

    const url = `${API_BASE}/repos/${this.config.owner}/${this.config.repo}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `GitHub API 오류 (${response.status}): ${errorBody}`
      );
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  /**
   * 카테고리 목록 조회 (tmp/ 아래 폴더 목록)
   */
  async getCategories(): Promise<Category[]> {
    const basePath = this.config?.basePath ?? "tmp";

    try {
      const contents = await this.request<GitHubContent[]>(
        `/contents/${basePath}?ref=${this.config?.branch ?? "main"}`
      );

      return contents
        .filter((item) => item.type === "dir")
        .map((item) => ({
          name: item.name,
          path: item.path,
        }));
    } catch (error: any) {
      // tmp 폴더가 아직 없는 경우
      if (error.message.includes("404")) {
        return [];
      }
      throw error;
    }
  }

  /**
   * 특정 카테고리의 초안 목록 조회
   */
  async getDrafts(categoryPath: string): Promise<Draft[]> {
    try {
      const contents = await this.request<GitHubContent[]>(
        `/contents/${categoryPath}?ref=${this.config?.branch ?? "main"}`
      );

      return contents
        .filter((item) => item.type === "file" && item.name.endsWith(".md"))
        .map((item) => ({
          name: item.name.replace(/\.md$/, ""),
          path: item.path,
          sha: item.sha,
          content: "",
          category: categoryPath.split("/").pop() ?? "",
        }));
    } catch (error: any) {
      if (error.message.includes("404")) {
        return [];
      }
      throw error;
    }
  }

  /**
   * 모든 카테고리의 초안 한번에 조회
   */
  async getAllDrafts(): Promise<{ category: Category; drafts: Draft[] }[]> {
    const categories = await this.getCategories();
    const results = await Promise.all(
      categories.map(async (category) => ({
        category,
        drafts: await this.getDrafts(category.path),
      }))
    );
    return results;
  }

  /**
   * 초안 파일 내용 조회
   */
  async getDraftContent(filePath: string): Promise<{ content: string; sha: string }> {
    const file = await this.request<GitHubContent>(
      `/contents/${filePath}?ref=${this.config?.branch ?? "main"}`
    );

    if (!file.content) {
      throw new Error("파일 내용을 가져올 수 없습니다.");
    }

    // GitHub API는 base64로 인코딩된 content를 반환
    const content = decodeBase64(file.content);
    return { content, sha: file.sha };
  }

  /**
   * 초안 파일 생성 또는 수정
   * GitHub API의 PUT은 자동으로 커밋+푸시를 수행합니다.
   *
   * @param filePath - 파일 경로 (예: "tmp/의료_의약/치매는_왜생기는가.md")
   * @param content - 마크다운 내용
   * @param sha - 기존 파일 수정 시 필요한 sha (새 파일은 undefined)
   * @param message - 커밋 메시지
   */
  async saveDraft(
    filePath: string,
    content: string,
    sha?: string,
    message?: string
  ): Promise<{ sha: string }> {
    const commitMessage = message ?? (sha ? `update: ${filePath}` : `create: ${filePath}`);

    const body: Record<string, string> = {
      message: commitMessage,
      content: encodeBase64(content),
      branch: this.config?.branch ?? "main",
    };

    if (sha) {
      body.sha = sha;
    }

    const result = await this.request<{ content: GitHubContent }>(
      `/contents/${filePath}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );

    return { sha: result.content.sha };
  }

  /**
   * 초안 파일 삭제
   */
  async deleteDraft(filePath: string, sha: string): Promise<void> {
    await this.request(`/contents/${filePath}`, {
      method: "DELETE",
      body: JSON.stringify({
        message: `delete: ${filePath}`,
        sha,
        branch: this.config?.branch ?? "main",
      }),
    });
  }

  /**
   * 새 카테고리 폴더 생성
   * GitHub API는 빈 폴더를 만들 수 없으므로 .gitkeep 파일을 생성합니다.
   */
  async createCategory(categoryName: string): Promise<void> {
    const basePath = this.config?.basePath ?? "tmp";
    await this.saveDraft(
      `${basePath}/${categoryName}/.gitkeep`,
      "",
      undefined,
      `create category: ${categoryName}`
    );
  }

  /**
   * 연결 테스트 (토큰 유효성 확인)
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<any>("");
      return { success: true, message: "연결 성공!" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

/** Base64 디코딩 (GitHub API 응답용) */
function decodeBase64(encoded: string): string {
  // GitHub API는 줄바꿈이 포함된 base64를 반환
  const cleaned = encoded.replace(/\n/g, "");
  const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Base64 인코딩 (GitHub API 요청용) */
function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary);
}

export const githubService = new GitHubService();

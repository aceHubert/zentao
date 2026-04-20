import axios, { AxiosInstance } from "axios";
import https from "https";
import { QueryValue, ZentaoApiResponse, ZentaoV1Options } from "../types";

/**
 * 禅道 REST API 基类。
 *
 * 统一封装 v1 / v2 客户端共享的 HTTP 实例、登录保护、请求方法与响应解析逻辑。
 */
export default abstract class Zentao<TOptions extends ZentaoV1Options = ZentaoV1Options> {
  protected readonly options: TOptions;
  protected readonly http: AxiosInstance;
  private token = "";

  constructor(options: TOptions) {
    this.options = options;

    const baseURL = options.url.endsWith("/") ? options.url.slice(0, -1) : options.url;

    this.http = axios.create({
      baseURL,
      timeout: options.timeout ?? 30000,
      headers: {
        "Content-Type": "application/json",
      },
      httpsAgent:
        options.rejectUnauthorized === false
          ? new https.Agent({ rejectUnauthorized: false })
          : undefined,
    });
  }

  /**
   * 当前已登录 token。
   */
  get authToken(): string {
    return this.token;
  }

  /**
   * 登录并获取 Token。
   */
  abstract login(): Promise<string>;

  protected setAuthToken(token: string, headerName: string): void {
    this.token = token;
    this.http.defaults.headers.common[headerName] = token;
  }

  protected async ensureLogin(): Promise<void> {
    if (!this.token) {
      await this.login();
    }
  }

  protected withQuery(path: string, query?: Record<string, QueryValue>): string {
    if (!query) return path;
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      search.append(key, String(value));
    }
    const queryString = search.toString();
    return queryString ? `${path}?${queryString}` : path;
  }

  protected extractData<T = any>(payload: ZentaoApiResponse<T>, fallbackKey?: string): T {
    if (payload.data !== undefined) return payload.data;
    if (fallbackKey && payload[fallbackKey] !== undefined) return payload[fallbackKey] as T;
    return payload as unknown as T;
  }

  protected async get<T = any>(
    path: string,
    query?: Record<string, QueryValue>,
    fallbackKey?: string,
  ): Promise<T> {
    await this.ensureLogin();
    const response = await this.http.get<ZentaoApiResponse<T>>(this.withQuery(path, query));
    return this.extractData(response.data, fallbackKey);
  }

  protected async post<T = any>(
    path: string,
    data?: Record<string, any>,
    fallbackKey?: string,
  ): Promise<T> {
    await this.ensureLogin();
    const response = await this.http.post<ZentaoApiResponse<T>>(path, data);
    return this.extractData(response.data, fallbackKey);
  }

  protected async put<T = any>(
    path: string,
    data?: Record<string, any>,
    fallbackKey?: string,
  ): Promise<T> {
    await this.ensureLogin();
    const response = await this.http.put<ZentaoApiResponse<T>>(path, data);
    return this.extractData(response.data, fallbackKey);
  }

  protected async delete(path: string): Promise<boolean> {
    await this.ensureLogin();
    const response = await this.http.delete<ZentaoApiResponse>(path);
    return this.isSuccess(response.data);
  }

  protected async postAction(path: string, data?: Record<string, any>): Promise<boolean> {
    await this.ensureLogin();
    const response = await this.http.post<ZentaoApiResponse>(path, data);
    return this.isSuccess(response.data);
  }

  protected async putAction(path: string, data?: Record<string, any>): Promise<boolean> {
    await this.ensureLogin();
    const response = await this.http.put<ZentaoApiResponse>(path, data);
    return this.isSuccess(response.data);
  }

  protected isSuccess(payload: ZentaoApiResponse): boolean {
    if (payload.result === "success" || payload.status === "success") return true;
    if (payload.data === true) return true;
    if (typeof payload.data === "object" && payload.data?.result === "success") return true;
    return false;
  }
}

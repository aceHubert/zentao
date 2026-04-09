import axios, { AxiosInstance, type ResponseType, type Method } from "axios";
import https from "https";
import type {
  ZentaoConfig,
  Bug,
  Story,
  Product,
  Project,
  CreateBugParams,
  ResolveBugParams,
  CloseBugParams,
  TestCase,
  TestCaseListResponse,
  CreateTestCaseParams,
  User,
  Doc,
  DocSpaceData,
  CreateDocParams,
  EditDocParams,
  CreateDocModuleParams,
  EditDocModuleParams,
  CloseStoryParams,
  CreateStoryParams,
  ZentaoFileReadResult,
} from "../types";
import type { IZentaoClient } from "./client.interface";

type LegacyRequestType = "PATH_INFO" | "GET";
type LegacyRequestParamPair = [string, unknown];
type LegacyRequestParams =
  | Array<LegacyRequestParamPair>
  | string
  | Record<string, unknown>;
type LegacyRequestData = Record<string, unknown> | URLSearchParams | string;

interface LegacyApiResult {
  status: 0 | 1;
  msg?: unknown;
  result?: unknown;
  raw?: unknown;
}

interface LegacyRequestOptions {
  params?: LegacyRequestParams;
  data?: LegacyRequestData;
  method?: Method;
  headers?: Record<string, string>;
  viewType?: string;
  responseType?: ResponseType;
  skipAutoLogin?: boolean;
  resultConvertor?: (
    remoteData: unknown,
    result: LegacyApiResult,
  ) => LegacyApiResult;
}

class LegacyServerConfig {
  readonly version: string;
  readonly requestType: LegacyRequestType;
  readonly requestFix: string;
  readonly moduleVar: string;
  readonly methodVar: string;
  readonly viewVar: string;
  readonly sessionVar: string;
  readonly sessionName: string;
  readonly sessionID: string;
  readonly random: number;
  readonly expiredTime: number;
  readonly serverTime: number;

  private tokenUpdatedAt?: number;

  constructor(config: Record<string, unknown>) {
    this.version = String(config.version ?? "");
    this.requestType = config.requestType === "GET" ? "GET" : "PATH_INFO";
    this.requestFix = String(config.requestFix ?? "-");
    this.moduleVar = String(config.moduleVar ?? "m");
    this.methodVar = String(config.methodVar ?? "f");
    this.viewVar = String(config.viewVar ?? "t");
    this.sessionVar = String(config.sessionVar ?? "zentaosid");
    this.sessionName = String(config.sessionName ?? "zentaosid");
    this.sessionID = String(config.sessionID ?? "");
    this.random = Number(config.random ?? 0);
    this.expiredTime = Number(config.expiredTime ?? 0);
    this.serverTime = Number(config.serverTime ?? 0);
  }

  get tokenAuth(): string {
    return `${this.sessionName}=${this.sessionID}`;
  }

  renewToken(): void {
    this.tokenUpdatedAt = Date.now();
  }

  get isTokenExpired(): boolean {
    if (!this.tokenUpdatedAt) {
      return true;
    }

    if (!this.expiredTime) {
      return false;
    }

    return (
      Date.now() - this.tokenUpdatedAt >=
      Math.max(this.expiredTime - 30, 0) * 1000
    );
  }
}

function formatZentaoUrl(url: string): string {
  let normalized = url.trim();

  if (normalized.endsWith("/index.php")) {
    normalized = normalized.slice(0, -"/index.php".length);
  }

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `http://${normalized}`;
  }

  if (!normalized.endsWith("/")) {
    normalized = `${normalized}/`;
  }

  return normalized;
}

function normalizeRequestParams(
  params?: LegacyRequestParams,
): LegacyRequestParamPair[] {
  if (!params) {
    return [];
  }

  if (typeof params === "string") {
    const search = new URLSearchParams(params);
    return Array.from(search.entries());
  }

  if (Array.isArray(params)) {
    return params;
  }

  return Object.keys(params)
    .sort()
    .map((key) => [key, params[key]]);
}

function appendFormValue(
  form: URLSearchParams,
  key: string,
  value: unknown,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      appendFormValue(form, `${key}[${index}]`, item),
    );
    return;
  }

  form.append(key, String(value));
}

function buildFormBody(data?: LegacyRequestData): string | undefined {
  if (!data) {
    return undefined;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data instanceof URLSearchParams) {
    return data.toString();
  }

  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    appendFormValue(form, key, value);
  }
  return form.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickRecord(
  value: unknown,
  ...keys: string[]
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  return value;
}

function pickCollection<T>(value: unknown, ...keys: string[]): T[] {
  const record = pickRecord(value, ...keys);
  if (!record) {
    if (Array.isArray(value)) {
      return value as T[];
    }
    return [];
  }

  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
    if (isRecord(candidate)) {
      return Object.values(candidate) as T[];
    }
  }

  return [];
}

function pickEntity<T>(value: unknown, ...keys: string[]): T | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (isRecord(candidate)) {
      return candidate as T;
    }
  }

  return value as T;
}

function pickNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickCreatedId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const patterns = [
      /(?:bugID|storyID|caseID|docID|id)=([0-9]+)/i,
      /(?:bug|story|testcase|case|doc|project|product|task|user)[-/]view[-/]([0-9]+)/i,
      /\/([0-9]+)(?:\.json|\.html)?$/i,
    ];

    for (const pattern of patterns) {
      const matched = value.match(pattern);
      if (matched) {
        return Number(matched[1]);
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const directKeys = ["id", "bugID", "storyID", "caseID", "docID"];
  for (const key of directKeys) {
    const directValue = pickNumber(value[key]);
    if (directValue !== null) {
      return directValue;
    }
  }

  const nestedKeys = ["data", "result", "locate", "message"];
  for (const key of nestedKeys) {
    const nestedValue = pickCreatedId(value[key]);
    if (nestedValue !== null) {
      return nestedValue;
    }
  }

  return null;
}

function normalizeReloadResult(
  remoteData: unknown,
  result: LegacyApiResult,
): LegacyApiResult {
  if (result.status === 1) {
    return result;
  }

  const textCandidates: unknown[] = [
    result.result,
    isRecord(remoteData) ? remoteData.data : undefined,
    isRecord(remoteData) ? remoteData.message : undefined,
  ];

  for (const candidate of textCandidates) {
    if (typeof candidate === "string" && candidate.includes("reload")) {
      return { ...result, status: 1, msg: "success" };
    }
  }

  return result;
}

export class ZentaoClientLegacy implements IZentaoClient {
  private readonly config: ZentaoConfig;
  private readonly baseUrl: string;
  private readonly http: AxiosInstance;

  private serverConfig?: LegacyServerConfig;
  private loggedIn = false;

  constructor(config: ZentaoConfig) {
    this.config = config;
    this.baseUrl = formatZentaoUrl(config.url);

    const axiosConfig: Parameters<typeof axios.create>[0] = {
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    if (config.rejectUnauthorized === false) {
      axiosConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    this.http = axios.create(axiosConfig);
  }

  async login(): Promise<boolean> {
    if (this.loggedIn && !this.serverConfig?.isTokenExpired) {
      return true;
    }

    if (!this.serverConfig) {
      await this.fetchConfig();
    }

    const result = await this.request("user", "login", {
      method: "POST",
      data: {
        account: this.config.account,
        password: this.config.password,
      },
      skipAutoLogin: true,
      resultConvertor: (remoteData, initialResult) => {
        if (isRecord(remoteData) && isRecord(remoteData.user)) {
          return { ...initialResult, result: remoteData.user };
        }
        return initialResult;
      },
    });

    if (result.status !== 1) {
      throw new Error(`Legacy 登录失败: ${String(result.msg ?? "未知错误")}`);
    }

    this.serverConfig?.renewToken();
    this.loggedIn = true;
    return true;
  }

  private async ensureLogin(): Promise<void> {
    if (!this.loggedIn || this.serverConfig?.isTokenExpired) {
      await this.login();
    }
  }

  private async fetchConfig(): Promise<LegacyServerConfig> {
    const response = await this.http.get("?mode=getconfig");
    const config = isRecord(response.data) ? response.data : {};
    this.serverConfig = new LegacyServerConfig(config);
    return this.serverConfig;
  }

  private createUrl(
    moduleName: string,
    methodName = "index",
    params?: LegacyRequestParamPair[],
    viewType = "json",
  ): string {
    if (!this.serverConfig) {
      throw new Error("Legacy 配置缺失，无法构建请求地址");
    }

    if (this.serverConfig.requestType === "PATH_INFO") {
      const parts = [
        this.baseUrl,
        moduleName,
        this.serverConfig.requestFix,
        methodName,
      ];
      for (const [, value] of params ?? []) {
        parts.push(
          this.serverConfig.requestFix,
          encodeURIComponent(String(value)),
        );
      }
      parts.push(`.${viewType}`);
      return parts.join("");
    }

    const query = new URLSearchParams({
      [this.serverConfig.moduleVar]: moduleName,
      [this.serverConfig.methodVar]: methodName,
      [this.serverConfig.viewVar]: viewType,
    });

    for (const [key, value] of params ?? []) {
      query.append(key, String(value));
    }

    return `${this.baseUrl}?${query.toString()}`;
  }

  private async request(
    moduleName: string,
    methodName = "index",
    options: LegacyRequestOptions = {},
  ): Promise<LegacyApiResult> {
    if (
      !options.skipAutoLogin &&
      `${moduleName}/${methodName}`.toLowerCase() !== "user/login"
    ) {
      await this.ensureLogin();
    } else if (!this.serverConfig) {
      await this.fetchConfig();
    }

    if (!this.serverConfig) {
      throw new Error(`Legacy 请求缺少服务端配置: ${moduleName}/${methodName}`);
    }

    const params = normalizeRequestParams(options.params);
    const url = this.createUrl(
      moduleName,
      methodName,
      params,
      options.viewType ?? "json",
    );
    const data = buildFormBody(options.data);
    try {
      const response = await this.http.request({
        method: options.method ?? "GET",
        url,
        data,
        responseType: options.responseType,
        headers: {
          Cookie: this.serverConfig.tokenAuth,
          ...(data
            ? { "Content-Type": "application/x-www-form-urlencoded" }
            : {}),
          ...options.headers,
        },
      });

      const remoteData = response.data;
      let result: LegacyApiResult;

      if (isRecord(remoteData)) {
        const parsedRemoteData = { ...remoteData };
        if (
          typeof parsedRemoteData.data === "string" &&
          (parsedRemoteData.data.startsWith("{") ||
            parsedRemoteData.data.startsWith("["))
        ) {
          try {
            parsedRemoteData.data = JSON.parse(parsedRemoteData.data);
          } catch {
            // 保持原值即可
          }
        }

        const success =
          parsedRemoteData.status === "success" ||
          parsedRemoteData.result === "success" ||
          parsedRemoteData.success === true;

        result = {
          status: success ? 1 : 0,
          msg: parsedRemoteData.message ?? (success ? "success" : "error"),
          result: parsedRemoteData.data ?? parsedRemoteData.result,
          raw: parsedRemoteData,
        };
      } else {
        result = {
          status: 0,
          msg: "error",
          result: remoteData,
          raw: remoteData,
        };
      }

      if (options.resultConvertor) {
        result = options.resultConvertor(remoteData, result);
      }

      if (
        `${moduleName}/${methodName}`.toLowerCase() === "user/login" &&
        result.status === 1
      ) {
        this.serverConfig.renewToken();
        this.loggedIn = true;
      }

      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  private parseCreateResultId(result: LegacyApiResult): number | null {
    return pickCreatedId(result.result) ?? pickCreatedId(result.raw);
  }

  async getBugs(
    productID: number,
    browseType = "unclosed",
    limit = 100,
  ): Promise<Bug[]> {
    const result = await this.request("bug", "browse", {
      params: [
        ["productID", productID],
        ["branch", 0],
        ["browseType", browseType],
        ["param", 0],
        ["orderBy", "id_desc"],
        ["recTotal", 0],
        ["recPerPage", limit],
        ["pageID", 1],
      ],
    });

    return pickCollection<Bug>(result.result, "bugs");
  }

  async getBug(bugID: number): Promise<Bug | null> {
    try {
      const result = await this.request("bug", "view", {
        params: [["bugID", bugID]],
      });
      return pickEntity<Bug>(result.result, "bug");
    } catch {
      return null;
    }
  }

  async createBug(params: CreateBugParams): Promise<Bug> {
    const result = await this.request("bug", "create", {
      method: "POST",
      params: [["productID", params.product]],
      resultConvertor: normalizeReloadResult,
      data: {
        product: params.product,
        title: params.title,
        branch: params.branch ?? 0,
        module: params.module ?? 0,
        execution: params.execution ?? 0,
        keywords: params.keywords,
        os: params.os ?? "all",
        browser: params.browser ?? "all",
        steps: params.steps,
        task: params.task ?? 0,
        story: params.story ?? 0,
        deadline: params.deadline,
        openedBuild: params.openedBuild?.length
          ? params.openedBuild
          : ["trunk"],
        assignedTo: params.assignedTo,
        project: params.project ?? 0,
        severity: params.severity,
        pri: params.pri,
        type: params.type,
      },
    });

    const created = pickEntity<Bug>(result.result, "bug");
    if (created) {
      return created;
    }

    const bugID = this.parseCreateResultId(result);
    if (bugID !== null) {
      const bug = await this.getBug(bugID);
      if (bug) {
        return bug;
      }
    }

    throw new Error(
      `创建 Legacy Bug 失败: ${String(result.msg ?? "未返回 Bug 数据")}`,
    );
  }

  async resolveBug(params: ResolveBugParams): Promise<boolean> {
    const result = await this.request("bug", "resolve", {
      method: "POST",
      params: [["bugID", params.id]],
      data: {
        resolution: params.resolution,
        resolvedBuild: params.resolvedBuild ?? "trunk",
        resolvedDate: new Date().toISOString().slice(0, 19).replace("T", " "),
        comment: params.comment ?? "",
        status: "resolved",
      },
      resultConvertor: (remoteData, initialResult) => {
        const normalized = normalizeReloadResult(remoteData, initialResult);
        if (
          isRecord(normalized.result) &&
          normalized.result.result === "fail"
        ) {
          return {
            ...normalized,
            status: 0,
            msg: normalized.result.message ?? normalized.msg,
            result: null,
          };
        }
        return normalized;
      },
    });

    return result.status === 1;
  }

  async closeBug(params: CloseBugParams): Promise<boolean> {
    const result = await this.request("bug", "close", {
      method: "POST",
      params: [["bugID", params.id]],
      data: {
        comment: params.comment ?? "",
      },
      resultConvertor: normalizeReloadResult,
    });

    return result.status === 1;
  }

  async getStories(
    productID: number,
    browseType = "allstory",
    limit = 100,
  ): Promise<Story[]> {
    const result = await this.request("story", "browse", {
      params: [
        ["productID", productID],
        ["branch", 0],
        ["browseType", browseType],
        ["param", 0],
        ["orderBy", "id_desc"],
        ["recTotal", 0],
        ["recPerPage", limit],
        ["pageID", 1],
      ],
    });

    return pickCollection<Story>(result.result, "stories");
  }

  async getStory(storyID: number): Promise<Story | null> {
    try {
      const result = await this.request("story", "view", {
        params: [["storyID", storyID]],
      });
      return pickEntity<Story>(result.result, "story");
    } catch {
      return null;
    }
  }

  async createStory(params: CreateStoryParams): Promise<Story> {
    const result = await this.request("story", "create", {
      method: "POST",
      params: [["productID", params.product]],
      resultConvertor: normalizeReloadResult,
      data: {
        product: params.product,
        title: params.title,
        category: params.category,
        pri: params.pri,
        spec: params.spec,
        verify: params.verify,
        estimate: params.estimate,
        module: params.module ?? 0,
        plan: params.plan ?? 0,
        source: params.source,
        sourceNote: params.sourceNote,
        keywords: params.keywords,
        reviewer: params.reviewer,
      },
    });

    const created = pickEntity<Story>(result.result, "story");
    if (created) {
      return created;
    }

    const storyID = this.parseCreateResultId(result);
    if (storyID !== null) {
      const story = await this.getStory(storyID);
      if (story) {
        return story;
      }
    }

    throw new Error(
      `创建 Legacy 需求失败: ${String(result.msg ?? "未返回需求数据")}`,
    );
  }

  async closeStory(params: CloseStoryParams): Promise<boolean> {
    const result = await this.request("story", "close", {
      method: "POST",
      params: [["storyID", params.id]],
      resultConvertor: normalizeReloadResult,
      data: {
        closedReason: params.closedReason,
        comment: params.comment ?? "",
      },
    });

    return result.status === 1;
  }

  async getTestCases(
    productID: number,
    limit = 100,
  ): Promise<TestCaseListResponse> {
    const result = await this.request("testcase", "browse", {
      params: [
        ["productID", productID],
        ["branch", 0],
        ["type", "all"],
        ["orderBy", "id_desc"],
        ["recTotal", 0],
        ["recPerPage", limit],
        ["pageID", 1],
      ],
    });

    const container = pickRecord(result.result, "cases", "testcases");
    const testcases = pickCollection<TestCase>(
      result.result,
      "cases",
      "testcases",
    );

    return {
      page: pickNumber(container?.pageID ?? container?.page) ?? 1,
      total:
        pickNumber(container?.recTotal ?? container?.total) ?? testcases.length,
      limit,
      testcases,
    };
  }

  async getTestCase(caseID: number): Promise<TestCase | null> {
    try {
      const result = await this.request("testcase", "view", {
        params: [["caseID", caseID]],
      });
      return pickEntity<TestCase>(result.result, "case", "testcase");
    } catch {
      return null;
    }
  }

  async createTestCase(params: CreateTestCaseParams): Promise<TestCase> {
    const payload: Record<string, unknown> = {
      product: params.product,
      branch: params.branch ?? 0,
      module: params.module ?? 0,
      story: params.story ?? 0,
      title: params.title,
      type: params.type,
      stage: params.stage ?? "",
      precondition: params.precondition ?? "",
      pri: params.pri ?? 3,
      keywords: params.keywords ?? "",
    };

    params.steps.forEach((step, index) => {
      const stepIndex = index + 1;
      payload[`steps[${stepIndex}]`] = step.desc;
      payload[`expects[${stepIndex}]`] = step.expect;
    });

    const result = await this.request("testcase", "create", {
      method: "POST",
      params: [["productID", params.product]],
      data: payload,
      resultConvertor: normalizeReloadResult,
    });

    const created = pickEntity<TestCase>(result.result, "case", "testcase");
    if (created) {
      return created;
    }

    const caseID = this.parseCreateResultId(result);
    if (caseID !== null) {
      const testcase = await this.getTestCase(caseID);
      if (testcase) {
        return testcase;
      }
    }

    throw new Error(
      `创建 Legacy 测试用例失败: ${String(result.msg ?? "未返回测试用例数据")}`,
    );
  }

  async getProducts(limit = 100): Promise<Product[]> {
    const result = await this.request("product", "all", {
      params: [
        ["productID", 0],
        ["line", 0],
        ["status", "all"],
        ["orderBy", "id_desc"],
        ["recTotal", 0],
        ["recPerPage", limit],
        ["pageID", 1],
      ],
    });

    return pickCollection<Product>(result.result, "products");
  }

  async getProduct(productID: number): Promise<Product | null> {
    try {
      const result = await this.request("product", "view", {
        params: [["productID", productID]],
      });
      return pickEntity<Product>(result.result, "product");
    } catch {
      return null;
    }
  }

  async getProjects(limit = 100): Promise<Project[]> {
    const result = await this.request("project", "all", {
      params: [
        ["status", "all"],
        ["projectID", 0],
        ["orderBy", "id_desc"],
        ["productID", 0],
        ["recTotal", 0],
        ["recPerPage", limit],
        ["pageID", 1],
      ],
    });

    return pickCollection<Project>(result.result, "projects");
  }

  async getProject(projectID: number): Promise<Project | null> {
    try {
      const result = await this.request("project", "view", {
        params: [["projectID", projectID]],
      });
      return pickEntity<Project>(result.result, "project");
    } catch {
      return null;
    }
  }

  async getUsers(limit = 100): Promise<User[]> {
    const result = await this.request("company", "browse", {
      params: [
        ["param", 0],
        ["type", "bydept"],
        ["orderBy", "id"],
        ["recTotal", 0],
        ["recPerPage", limit],
        ["pageID", 1],
      ],
    });

    return pickCollection<User>(result.result, "users");
  }

  async getUser(userID: number): Promise<User | null> {
    try {
      const result = await this.request("user", "view", {
        params: [["userID", userID]],
      });
      return pickEntity<User>(result.result, "user");
    } catch {
      return null;
    }
  }

  async getMyProfile(): Promise<User | null> {
    try {
      const profileResult = await this.request("my", "profile");
      const profile = pickEntity<User>(profileResult.result, "profile", "user");
      if (profile) {
        return profile;
      }
    } catch {
      // 继续使用兜底策略
    }

    try {
      const userResult = await this.request("user", "view", {
        params: [["userID", this.config.account]],
      });
      const user = pickEntity<User>(userResult.result, "user");
      if (user) {
        return user;
      }
    } catch {
      // 继续使用兜底策略
    }

    const users = await this.getUsers(500);
    return users.find((user) => user.account === this.config.account) ?? null;
  }

  async getDocSpaceData(
    type: "product" | "project",
    spaceID: number,
  ): Promise<DocSpaceData> {
    const result = await this.request("doc", "ajaxGetSpaceData", {
      params: [
        ["type", type],
        ["spaceID", spaceID],
        ["picks", ""],
      ],
      resultConvertor: (remoteData) => {
        return {
          status: 1,
          msg: "success",
          result: remoteData,
          raw: remoteData,
        };
      },
    });

    return result.result as DocSpaceData;
  }

  async getDoc(docID: number, version = 0): Promise<Doc | null> {
    try {
      const result = await this.request("doc", "ajaxGetDoc", {
        params: [
          ["docID", docID],
          ["version", version],
        ],
        resultConvertor: (remoteData) => {
          return {
            status: 1,
            msg: "success",
            result: remoteData,
            raw: remoteData,
          };
        },
      });

      return result.result as Doc;
    } catch {
      return null;
    }
  }

  async createDoc(params: CreateDocParams): Promise<{ id: number; doc: Doc }> {
    // 保持与 v1 兼容的最小实现：缺少 objectType/objectID 入参时，沿用产品空间默认值。
    const form: Record<string, unknown> = {
      title: params.title,
      content: params.content ?? "",
      lib: params.lib,
      module: params.module ?? 0,
      parent: "m_0",
      status: "normal",
      contentType: "doc",
      type: params.type ?? "text",
      acl: "open",
      space: "product",
      product: 1,
      uid: `doc${Date.now()}`,
      template: 0,
      contactList: "",
    };

    if (params.url) {
      form.url = params.url;
    }
    if (params.keywords) {
      form.keywords = params.keywords;
    }

    const result = await this.request("doc", "create", {
      method: "POST",
      params: [
        ["objectType", "product"],
        ["objectID", 1],
        ["libID", params.lib],
        ["moduleID", params.module ?? 0],
      ],
      data: form,
    });

    const payload = (result.raw ?? result.result ?? {}) as {
      result?: string;
      message?: string;
      id?: number;
      doc?: Doc;
    };

    if (payload.result !== "success") {
      throw new Error(payload.message ?? "创建文档失败");
    }

    const doc = payload.doc ?? (await this.getDoc(payload.id ?? 0));
    if (!doc || !payload.id) {
      throw new Error("创建文档失败: 未返回文档详情");
    }

    return { id: payload.id, doc };
  }

  async editDoc(params: EditDocParams): Promise<Doc | null> {
    const form: Record<string, unknown> = {};
    if (params.title !== undefined) {
      form.title = params.title;
    }
    if (params.content !== undefined) {
      form.content = params.content;
    }
    if (params.keywords !== undefined) {
      form.keywords = params.keywords;
    }

    form.lib = 1;
    form.module = 0;
    form.parent = 0;
    form.status = "normal";
    form.contentType = "doc";
    form.type = "text";
    form.acl = "open";
    form.space = "product";
    form.uid = `doc${params.id}`;
    form.files = "";
    form.fromVersion = 1;

    try {
      const result = await this.request("doc", "edit", {
        method: "POST",
        params: [["docID", params.id]],
        data: form,
      });

      const payload = (result.raw ?? result.result ?? {}) as {
        result?: string;
        message?: string;
        doc?: Doc;
      };

      if (payload.result !== "success") {
        throw new Error(payload.message ?? "编辑文档失败");
      }

      return payload.doc ?? (await this.getDoc(params.id));
    } catch {
      return null;
    }
  }

  async createDocModule(
    params: CreateDocModuleParams,
  ): Promise<{ id: number; name: string }> {
    const form: Record<string, unknown> = {
      name: params.name,
      libID: params.libID,
      parentID: params.parentID ?? 0,
      objectID: params.objectID,
      moduleType: "doc",
      isUpdate: false,
      createType: "child",
    };

    const result = await this.request("tree", "ajaxCreateModule", {
      method: "POST",
      data: form,
    });

    const payload = (result.raw ?? result.result ?? {}) as {
      result?: string;
      message?: string;
      module?: { id: number; name: string };
    };

    if (payload.result !== "success") {
      throw new Error(payload.message ?? "创建文档目录失败");
    }

    return {
      id: payload.module?.id ?? 0,
      name: payload.module?.name ?? params.name,
    };
  }

  async editDocModule(params: EditDocModuleParams): Promise<boolean> {
    const form: Record<string, unknown> = {
      root: params.root,
      parent: params.parent ?? 0,
      name: params.name,
    };

    try {
      const result = await this.request("doc", "editCatalog", {
        method: "POST",
        params: [
          ["moduleID", params.moduleID],
          ["type", "doc"],
        ],
        data: form,
      });

      const payload = (result.raw ?? result.result ?? {}) as {
        result?: string;
      };
      return payload.result === "success";
    } catch {
      return false;
    }
  }

  async readFile(
    fileID: number,
    fileType: string,
  ): Promise<ZentaoFileReadResult> {
    const result = await this.request("file", "read", {
      params: [["fileID", fileID]],
      viewType: fileType,
      responseType: "arraybuffer",
      resultConvertor: (remoteData) => {
        const buffer = Buffer.from(remoteData as ArrayBuffer);
        return {
          status: 1,
          msg: "success",
          result: {
            fileID,
            fileType,
            mimeType: this.resolveFileMimeType(fileType),
            encoding: "base64",
            data: buffer.toString("base64"),
            size: buffer.byteLength,
          } satisfies ZentaoFileReadResult,
          raw: remoteData,
        };
      },
    });

    return result.result as ZentaoFileReadResult;
  }

  private resolveFileMimeType(fileType: string): string {
    const normalized = fileType.trim().toLowerCase();
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      pdf: "application/pdf",
      txt: "text/plain",
    };

    return mimeMap[normalized] ?? "application/octet-stream";
  }
}

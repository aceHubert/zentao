import axios, { type AxiosInstance } from "axios";
import https from "https";
import type {
  Bug,
  CloseBugParams,
  CloseStoryParams,
  CreateBugParams,
  CreateDocModuleParams,
  CreateDocParams,
  CreateStoryParams,
  CreateTestCaseParams,
  Doc,
  DocSpaceData,
  EditDocModuleParams,
  EditDocParams,
  Product,
  Project,
  ResolveBugParams,
  Story,
  TestCase,
  TestCaseListResponse,
  User,
  ZentaoFileReadResult,
  ZentaoConfig,
} from "../types";
import type { IZentaoClient } from "./client.interface";
import { ZentaoClientLegacy } from "./client-legacy";

type ListEnvelopeKey =
  | "bugs"
  | "stories"
  | "testcases"
  | "products"
  | "projects"
  | "users";

type MaybeRecord = Record<string, unknown>;

interface PagerInfo {
  pageID?: number;
  page?: number;
  recPerPage?: number;
  limit?: number;
  total?: number;
  recTotal?: number;
}

/**
 * 禅道 API v2 客户端。
 * 仅使用 /api.php/v2 路径，未在官方 v2 文档中明确给出的能力会显式降级或报未支持。
 */
export class ZentaoClientV2 implements IZentaoClient {
  private readonly config: ZentaoConfig;
  private readonly http: AxiosInstance;
  private readonly legacyClient: ZentaoClientLegacy;
  private token = "";
  private isLoggedIn = false;
  private currentAccount: string;

  constructor(config: ZentaoConfig) {
    this.config = config;
    this.legacyClient = new ZentaoClientLegacy(config);
    this.currentAccount = config.account;

    const baseURL = config.url.endsWith("/")
      ? config.url.slice(0, -1)
      : config.url;

    const axiosConfig: Parameters<typeof axios.create>[0] = {
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (config.rejectUnauthorized === false) {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    this.http = axios.create(axiosConfig);
  }

  async login(): Promise<boolean> {
    if (this.isLoggedIn) {
      return true;
    }

    try {
      const response = await this.http.post("/api.php/v2/users/login", {
        account: this.config.account,
        password: this.config.password,
      });

      const payload = this.asRecord(response.data);
      const token = this.pickString(payload, ["token"]);
      if (!token) {
        throw new Error("登录响应中缺少 token");
      }

      this.token = token;
      this.isLoggedIn = true;
      this.http.defaults.headers.common.token = token;
      this.currentAccount =
        this.pickString(payload, ["account"]) ?? this.config.account;
      return true;
    } catch (error) {
      throw new Error(
        `禅道 v2 登录失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
      );
    }
  }

  async getBugs(
    productID: number,
    browseType?: string,
    limit?: number,
  ): Promise<Bug[]> {
    await this.ensureLogin();
    const response = await this.http.get(
      `/api.php/v2/products/${productID}/bugs${this.buildQuery({
        browseType,
        recPerPage: limit,
        pageID: 1,
      })}`,
    );
    return this.extractList<Bug>(response.data, "bugs");
  }

  async getBug(bugID: number): Promise<Bug | null> {
    await this.ensureLogin();

    try {
      const response = await this.http.get(`/api.php/v2/bugs/${bugID}`);
      return this.extractEntity<Bug>(response.data, ["bug"]);
    } catch {
      return null;
    }
  }

  async createBug(params: CreateBugParams): Promise<Bug> {
    await this.ensureLogin();

    const payload: MaybeRecord = {
      productID: params.product,
      title: params.title,
      severity: params.severity,
      pri: params.pri,
      type: params.type,
    };

    if (params.branch !== undefined) payload.branch = params.branch;
    if (params.module !== undefined) payload.module = params.module;
    if (params.execution !== undefined) payload.execution = params.execution;
    if (params.keywords !== undefined) payload.keywords = params.keywords;
    if (params.os !== undefined) payload.os = params.os;
    if (params.browser !== undefined) payload.browser = params.browser;
    if (params.steps !== undefined) payload.steps = params.steps;
    if (params.task !== undefined) payload.task = params.task;
    if (params.story !== undefined) payload.story = params.story;
    if (params.deadline !== undefined) payload.deadline = params.deadline;
    if (params.openedBuild !== undefined)
      payload.openedBuild = params.openedBuild;
    if (params.assignedTo !== undefined) payload.assignedTo = params.assignedTo;
    if (params.project !== undefined) payload.project = params.project;

    const response = await this.http.post("/api.php/v2/bugs", payload);
    const bugID = this.extractCreatedID(response.data);
    const bug = await this.getBug(bugID);
    if (!bug) {
      throw new Error(`Bug 已创建，但无法通过 v2 获取详情: ${bugID}`);
    }
    return bug;
  }

  async resolveBug(params: ResolveBugParams): Promise<boolean> {
    await this.ensureLogin();

    try {
      const payload: MaybeRecord = {
        resolution: params.resolution,
        comment: params.comment ?? "",
      };
      if (params.resolvedBuild !== undefined) {
        payload.resolvedBuild = params.resolvedBuild;
      }

      await this.http.put(`/api.php/v2/bugs/${params.id}/resolve`, payload);
      return true;
    } catch {
      return false;
    }
  }

  async closeBug(params: CloseBugParams): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.put(`/api.php/v2/bugs/${params.id}/close`, {
        comment: params.comment ?? "",
      });
      return true;
    } catch {
      return false;
    }
  }

  async getStories(
    productID: number,
    browseType?: string,
    limit?: number,
  ): Promise<Story[]> {
    await this.ensureLogin();
    const response = await this.http.get(
      `/api.php/v2/products/${productID}/stories${this.buildQuery({
        browseType,
        recPerPage: limit,
        pageID: 1,
      })}`,
    );
    return this.extractList<Story>(response.data, "stories");
  }

  async getStory(storyID: number): Promise<Story | null> {
    await this.ensureLogin();

    try {
      const response = await this.http.get(`/api.php/v2/stories/${storyID}`);
      return this.extractEntity<Story>(response.data, ["story"]);
    } catch {
      return null;
    }
  }

  async createStory(params: CreateStoryParams): Promise<Story> {
    await this.ensureLogin();

    const payload: MaybeRecord = {
      productID: params.product,
      title: params.title,
      category: params.category,
      pri: params.pri,
      spec: params.spec,
      reviewer: params.reviewer,
    };

    if (params.verify !== undefined) payload.verify = params.verify;
    if (params.estimate !== undefined) payload.estimate = params.estimate;
    if (params.module !== undefined) payload.module = params.module;
    if (params.plan !== undefined) payload.plan = params.plan;
    if (params.source !== undefined) payload.source = params.source;
    if (params.sourceNote !== undefined) payload.sourceNote = params.sourceNote;
    if (params.keywords !== undefined) payload.keywords = params.keywords;

    const response = await this.http.post("/api.php/v2/stories", payload);
    const storyID = this.extractCreatedID(response.data);
    const story = await this.getStory(storyID);
    if (!story) {
      throw new Error(`需求已创建，但无法通过 v2 获取详情: ${storyID}`);
    }
    return story;
  }

  async closeStory(params: CloseStoryParams): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.put(`/api.php/v2/stories/${params.id}/close`, {
        closedReason: params.closedReason,
        comment: params.comment ?? "",
      });
      return true;
    } catch {
      return false;
    }
  }

  async getTestCases(
    productID: number,
    limit = 100,
  ): Promise<TestCaseListResponse> {
    await this.ensureLogin();
    const response = await this.http.get(
      `/api.php/v2/products/${productID}/testcases${this.buildQuery({
        recPerPage: limit,
        pageID: 1,
      })}`,
    );

    const testcases = this.extractList<TestCase>(response.data, "testcases");
    const pager = this.extractPager(response.data);

    return {
      page: pager.pageID ?? pager.page ?? 1,
      total: pager.total ?? pager.recTotal ?? testcases.length,
      limit: pager.recPerPage ?? pager.limit ?? limit,
      testcases,
    };
  }

  async getTestCase(caseID: number): Promise<TestCase | null> {
    await this.ensureLogin();

    try {
      const response = await this.http.get(`/api.php/v2/testcases/${caseID}`);
      return this.extractEntity<TestCase>(response.data, ["testcase", "case"]);
    } catch {
      return null;
    }
  }

  async createTestCase(params: CreateTestCaseParams): Promise<TestCase> {
    await this.ensureLogin();

    const steps = params.steps.map((step) => step.desc);
    const expects = params.steps.map((step) => step.expect);

    const payload: MaybeRecord = {
      productID: params.product,
      title: params.title,
      type: params.type,
      steps,
      expects,
      stepType: "step",
    };

    if (params.branch !== undefined) payload.branch = params.branch;
    if (params.module !== undefined) payload.module = params.module;
    if (params.story !== undefined) payload.story = params.story;
    if (params.stage !== undefined) payload.stage = params.stage;
    if (params.precondition !== undefined) {
      payload.precondition = params.precondition;
    }
    if (params.pri !== undefined) payload.pri = params.pri;
    if (params.keywords !== undefined) payload.keywords = params.keywords;

    const response = await this.http.post("/api.php/v2/testcases", payload);
    const caseID = this.extractCreatedID(response.data);
    const testcase = await this.getTestCase(caseID);
    if (!testcase) {
      throw new Error(`测试用例已创建，但无法通过 v2 获取详情: ${caseID}`);
    }
    return testcase;
  }

  async getProducts(limit = 100): Promise<Product[]> {
    await this.ensureLogin();
    const response = await this.http.get(
      `/api.php/v2/products${this.buildQuery({
        recPerPage: limit,
        pageID: 1,
      })}`,
    );
    return this.extractList<Product>(response.data, "products");
  }

  async getProduct(productID: number): Promise<Product | null> {
    await this.ensureLogin();

    try {
      const response = await this.http.get(`/api.php/v2/products/${productID}`);
      return this.extractEntity<Product>(response.data, ["product"]);
    } catch {
      return null;
    }
  }

  async getProjects(limit = 100): Promise<Project[]> {
    await this.ensureLogin();
    const response = await this.http.get(
      `/api.php/v2/projects${this.buildQuery({
        recPerPage: limit,
        pageID: 1,
      })}`,
    );
    return this.extractList<Project>(response.data, "projects");
  }

  async getProject(projectID: number): Promise<Project | null> {
    await this.ensureLogin();

    // 官方 v2 文档里当前只明确给到了项目列表端点，这里按列表过滤做最小兼容。
    const projects = await this.getProjects(200);
    return projects.find((project) => project.id === projectID) ?? null;
  }

  async getUsers(limit = 100): Promise<User[]> {
    await this.ensureLogin();
    const response = await this.http.get(
      `/api.php/v2/users${this.buildQuery({
        recPerPage: limit,
        pageID: 1,
      })}`,
    );
    return this.extractList<User>(response.data, "users");
  }

  async getUser(userID: number): Promise<User | null> {
    await this.ensureLogin();

    try {
      const response = await this.http.get(`/api.php/v2/users/${userID}`);
      return this.extractEntity<User>(response.data, ["user"]);
    } catch {
      return null;
    }
  }

  async getMyProfile(): Promise<User | null> {
    await this.ensureLogin();

    // 官方 v2 文档未确认独立的“当前用户资料”端点，这里退化为按登录账号匹配用户列表。
    const users = await this.getUsers(200);
    return users.find((user) => user.account === this.currentAccount) ?? null;
  }

  async getDocSpaceData(
    type: "product" | "project",
    spaceID: number,
  ): Promise<DocSpaceData> {
    return this.legacyClient.getDocSpaceData(type, spaceID);
  }

  async getDoc(docID: number, version?: number): Promise<Doc | null> {
    return this.legacyClient.getDoc(docID, version);
  }

  async createDoc(params: CreateDocParams): Promise<{ id: number; doc: Doc }> {
    return this.legacyClient.createDoc(params);
  }

  async editDoc(params: EditDocParams): Promise<Doc | null> {
    return this.legacyClient.editDoc(params);
  }

  async createDocModule(
    params: CreateDocModuleParams,
  ): Promise<{ id: number; name: string }> {
    return this.legacyClient.createDocModule(params);
  }

  async editDocModule(params: EditDocModuleParams): Promise<boolean> {
    return this.legacyClient.editDocModule(params);
  }

  async readFile(
    fileID: number,
    fileType: string,
  ): Promise<ZentaoFileReadResult> {
    return this.legacyClient.readFile(fileID, fileType);
  }

  private async ensureLogin(): Promise<void> {
    if (!this.isLoggedIn) {
      await this.login();
    }
  }

  private buildQuery(
    params: Record<string, string | number | undefined>,
  ): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    }

    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }

  private extractList<T>(input: unknown, key: ListEnvelopeKey): T[] {
    const payload = this.asRecord(input);
    const list = payload[key];
    if (Array.isArray(list)) {
      return list as T[];
    }

    if (Array.isArray(payload.data)) {
      return payload.data as T[];
    }

    const data = this.asOptionalRecord(payload.data);
    const nestedList = data?.[key];
    if (Array.isArray(nestedList)) {
      return nestedList as T[];
    }

    return [];
  }

  private extractEntity<T>(input: unknown, keys: string[]): T | null {
    const payload = this.asRecord(input);

    for (const key of keys) {
      const entity = payload[key];
      if (this.isEntity(entity)) {
        return entity as T;
      }
    }

    const data = this.asOptionalRecord(payload.data);
    if (data) {
      for (const key of keys) {
        const entity = data[key];
        if (this.isEntity(entity)) {
          return entity as T;
        }
      }
    }

    if (this.isEntity(payload)) {
      return payload as T;
    }

    return null;
  }

  private extractCreatedID(input: unknown): number {
    const payload = this.asRecord(input);
    const directID = this.pickNumber(payload, ["id"]);
    if (directID !== undefined) {
      return directID;
    }

    const data = this.asOptionalRecord(payload.data);
    const nestedID = data ? this.pickNumber(data, ["id"]) : undefined;
    if (nestedID !== undefined) {
      return nestedID;
    }

    throw new Error("创建接口响应中缺少 id");
  }

  private extractPager(input: unknown): PagerInfo {
    const payload = this.asRecord(input);
    const pager = this.asOptionalRecord(payload.pager);
    if (pager) {
      return pager as PagerInfo;
    }

    const data = this.asOptionalRecord(payload.data);
    const nestedPager = this.asOptionalRecord(data?.pager);
    if (nestedPager) {
      return nestedPager as PagerInfo;
    }

    return {};
  }

  private asRecord(input: unknown): MaybeRecord {
    if (input && typeof input === "object" && !Array.isArray(input)) {
      return input as MaybeRecord;
    }
    return {};
  }

  private asOptionalRecord(input: unknown): MaybeRecord | null {
    if (input && typeof input === "object" && !Array.isArray(input)) {
      return input as MaybeRecord;
    }
    return null;
  }

  private isEntity(input: unknown): boolean {
    return Boolean(input && typeof input === "object" && !Array.isArray(input));
  }

  private pickString(record: MaybeRecord, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return undefined;
  }

  private pickNumber(record: MaybeRecord, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return undefined;
  }
}

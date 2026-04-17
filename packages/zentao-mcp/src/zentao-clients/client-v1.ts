/**
 * 禅道 API 客户端
 * 封装禅道 REST API V1 的调用，支持 Bug 和需求的增删改查
 */

import axios, { AxiosInstance, AxiosResponse } from "axios";
import https from "https";
import CryptoJS from "crypto-js";
import {
  ZentaoConfig,
  Bug,
  Story,
  Product,
  Project,
  CreateBugParams,
  ResolveBugParams,
  CloseBugParams,
  ActivateBugParams,
  UpdateBugParams,
  CreateStoryParams,
  CloseStoryParams,
  UpdateStoryParams,
  ChangeStoryParams,
  ApiResponse,
  TestCase,
  TestCaseListResponse,
  CreateTestCaseParams,
  Task,
  CreateTaskParams,
  UpdateTaskParams,
  User,
  CreateUserParams,
  UpdateUserParams,
  Program,
  CreateProgramParams,
  UpdateProgramParams,
  Plan,
  CreatePlanParams,
  UpdatePlanParams,
  Release,
  Build,
  CreateBuildParams,
  UpdateBuildParams,
  Execution,
  CreateExecutionParams,
  UpdateExecutionParams,
  CreateProductParams,
  UpdateProductParams,
  CreateProjectParams,
  UpdateProjectParams,
  Doc,
  DocSpaceData,
  CreateDocParams,
  EditDocParams,
  CreateDocModuleParams,
  EditDocModuleParams,
  ZentaoFileReadResult,
} from "../types";
import type { IZentaoClient } from "./client.interface";
import { ZentaoClientLegacy } from "./client-legacy";

/**
 * 禅道 API 客户端类
 * 提供与禅道系统交互的所有方法
 */
export class ZentaoClientV1 implements IZentaoClient {
  private config: ZentaoConfig;
  private http: AxiosInstance;
  private legacyClient: ZentaoClientLegacy;
  private sessionID: string = "";
  private isLoggedIn: boolean = false;

  /**
   * 创建禅道客户端实例
   * @param config - 禅道配置
   */
  constructor(config: ZentaoConfig) {
    this.config = config;
    this.legacyClient = new ZentaoClientLegacy(config);

    // 规范化 URL
    const baseURL = config.url.endsWith("/") ? config.url.slice(0, -1) : config.url;

    // 创建 axios 实例配置
    const axiosConfig: Parameters<typeof axios.create>[0] = {
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    };

    // 如果配置跳过SSL验证，创建自定义 https agent
    if (config.rejectUnauthorized === false) {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    this.http = axios.create(axiosConfig);
  }

  /**
   * 获取 Session ID
   * @returns Session ID
   */
  private async getSessionID(): Promise<string> {
    const response = await this.http.get("/api.php/v1/tokens");
    return response.data.data || response.data.sessionID || response.data;
  }

  /**
   * 登录禅道系统
   * @returns 是否登录成功
   */
  async login(): Promise<boolean> {
    if (this.isLoggedIn) {
      return true;
    }

    try {
      // 获取 session
      this.sessionID = await this.getSessionID();

      // 密码 MD5 加密
      const passwordMd5 = CryptoJS.MD5(this.config.password).toString();

      // 登录请求
      const response = await this.http.post(`/api.php/v1/tokens`, {
        account: this.config.account,
        password: passwordMd5,
      });

      if (response.data.token) {
        // 新版本 API 返回 token
        this.http.defaults.headers.common["Token"] = response.data.token;
        this.isLoggedIn = true;
      } else if (response.data.data?.token) {
        this.http.defaults.headers.common["Token"] = response.data.data.token;
        this.isLoggedIn = true;
      } else {
        // 老版本可能使用 session
        this.http.defaults.headers.common["Cookie"] = `zentaosid=${this.sessionID}`;
        this.isLoggedIn = true;
      }

      return true;
    } catch (error) {
      console.error("禅道登录失败:", error);
      throw new Error(`禅道登录失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 确保已登录
   */
  private async ensureLogin(): Promise<void> {
    if (!this.isLoggedIn) {
      await this.login();
    }
  }

  // ==================== Bug 相关方法 ====================

  /**
   * 获取 Bug 列表
   * @param productID - 产品 ID
   * @param browseType - 浏览类型: all-全部, unclosed-未关闭, unresolved-未解决, toclosed-待关闭, openedbyme-我创建, assigntome-指派给我
   * @param limit - 返回数量限制
   * @returns Bug 列表
   */
  async getBugs(productID: number, browseType?: string, limit?: number): Promise<Bug[]> {
    await this.ensureLogin();

    const params = new URLSearchParams();
    if (browseType) params.append("status", browseType);
    if (limit) params.append("limit", limit.toString());

    const queryString = params.toString();
    const url = `/api.php/v1/products/${productID}/bugs${queryString ? "?" + queryString : ""}`;
    const response: AxiosResponse<ApiResponse<Bug[]>> = await this.http.get(url);
    return response.data.data || (response.data as unknown as { bugs: Bug[] }).bugs || [];
  }

  /**
   * 获取指派给某人的 Bug
   * @param account - 用户账号
   * @param limit - 返回数量限制
   * @returns Bug 列表
   */
  async getAssignedBugs(account: string, limit: number = 100): Promise<Bug[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Bug[]>> = await this.http.get(
      `/api.php/v1/bugs?assignedTo=${account}&limit=${limit}`,
    );
    return response.data.data || (response.data as unknown as { bugs: Bug[] }).bugs || [];
  }

  /**
   * 获取 Bug 详情
   * @param bugID - Bug ID
   * @returns Bug 详情
   */
  async getBug(bugID: number): Promise<Bug | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Bug>> = await this.http.get(
        `/api.php/v1/bugs/${bugID}`,
      );
      return response.data.data || (response.data as unknown as Bug);
    } catch {
      return null;
    }
  }

  /**
   * 创建 Bug
   * @param params - 创建 Bug 参数
   * @returns 新创建的 Bug
   */
  async createBug(params: CreateBugParams): Promise<Bug> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      title: params.title,
      severity: params.severity,
      pri: params.pri,
      type: params.type,
    };

    // 可选参数，仅在有值时添加
    if (params.branch !== undefined) data.branch = params.branch;
    if (params.module !== undefined) data.module = params.module;
    if (params.execution !== undefined) data.execution = params.execution;
    if (params.keywords !== undefined) data.keywords = params.keywords;
    if (params.os !== undefined) data.os = params.os;
    if (params.browser !== undefined) data.browser = params.browser;
    if (params.steps !== undefined) data.steps = params.steps;
    if (params.task !== undefined) data.task = params.task;
    if (params.story !== undefined) data.story = params.story;
    if (params.deadline !== undefined) data.deadline = params.deadline;
    if (params.openedBuild !== undefined) data.openedBuild = params.openedBuild;
    if (params.assignedTo !== undefined) data.assignedTo = params.assignedTo;
    if (params.project !== undefined) data.project = params.project;

    const response: AxiosResponse<ApiResponse<Bug>> = await this.http.post(
      `/api.php/v1/products/${params.product}/bugs`,
      data,
    );

    return response.data.data || (response.data as unknown as Bug);
  }

  /**
   * 解决 Bug
   * @param params - 解决 Bug 参数
   * @returns 操作结果
   */
  async resolveBug(params: ResolveBugParams): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/bugs/${params.id}/resolve`, {
        resolution: params.resolution,
        resolvedBuild: params.resolvedBuild || "trunk",
        comment: params.comment || "",
      });
      return true;
    } catch (error) {
      console.error("解决 Bug 失败:", error);
      return false;
    }
  }

  /**
   * 关闭 Bug
   * @param params - 关闭 Bug 参数
   * @returns 操作结果
   */
  async closeBug(params: CloseBugParams): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/bugs/${params.id}/close`, {
        comment: params.comment || "",
      });
      return true;
    } catch (error) {
      console.error("关闭 Bug 失败:", error);
      return false;
    }
  }

  /**
   * 激活 Bug（重新打开）
   * @param params - 激活 Bug 参数
   * @returns 操作结果
   */
  async activateBug(params: ActivateBugParams): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/bugs/${params.id}/activate`, {
        assignedTo: params.assignedTo || "",
        comment: params.comment || "",
      });
      return true;
    } catch (error) {
      console.error("激活 Bug 失败:", error);
      return false;
    }
  }

  /**
   * 确认 Bug
   * @param bugID - Bug ID
   * @param assignedTo - 指派给（可选）
   * @returns 操作结果
   */
  async confirmBug(bugID: number, assignedTo?: string): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/bugs/${bugID}/confirm`, {
        assignedTo: assignedTo || "",
      });
      return true;
    } catch (error) {
      console.error("确认 Bug 失败:", error);
      return false;
    }
  }

  // ==================== 需求相关方法 ====================

  /**
   * 获取需求列表
   * @param productID - 产品 ID
   * @param browseType - 浏览类型: allstory-全部, unclosed-未关闭, draftstory-草稿, activestory-激活, reviewingstory-评审中, closedstory-已关闭, openedbyme-我创建
   * @param limit - 返回数量限制
   * @returns 需求列表
   */
  async getStories(productID: number, browseType?: string, limit?: number): Promise<Story[]> {
    await this.ensureLogin();

    const params = new URLSearchParams();
    if (browseType) params.append("status", browseType);
    if (limit) params.append("limit", limit.toString());

    const queryString = params.toString();
    const url = `/api.php/v1/products/${productID}/stories${queryString ? "?" + queryString : ""}`;
    const response: AxiosResponse<ApiResponse<Story[]>> = await this.http.get(url);
    return response.data.data || (response.data as unknown as { stories: Story[] }).stories || [];
  }

  /**
   * 获取需求详情
   * @param storyID - 需求 ID
   * @returns 需求详情
   */
  async getStory(storyID: number): Promise<Story | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Story>> = await this.http.get(
        `/api.php/v1/stories/${storyID}`,
      );
      return response.data.data || (response.data as unknown as Story);
    } catch {
      return null;
    }
  }

  /**
   * 创建需求
   * @param params - 创建需求参数
   * @returns 新创建的需求
   */
  async createStory(params: CreateStoryParams): Promise<Story> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      product: params.product,
      title: params.title,
      category: params.category,
      pri: params.pri,
      spec: params.spec,
      reviewer: params.reviewer,
    };
    if (params.verify !== undefined) data.verify = params.verify;
    if (params.estimate !== undefined) data.estimate = params.estimate;
    if (params.module !== undefined) data.module = params.module;
    if (params.plan !== undefined) data.plan = params.plan;
    if (params.source !== undefined) data.source = params.source;
    if (params.sourceNote !== undefined) data.sourceNote = params.sourceNote;
    if (params.keywords !== undefined) data.keywords = params.keywords;

    try {
      const response: AxiosResponse<ApiResponse<Story>> = await this.http.post(
        `/api.php/v1/products/${params.product}/stories`,
        data,
      );

      // 尝试多种响应格式
      if (response.data.data) {
        return response.data.data;
      }
      if (response.data && typeof response.data === "object" && "id" in response.data) {
        return response.data as unknown as Story;
      }
      // 返回完整响应作为调试信息
      return response.data as unknown as Story;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: unknown };
        message?: string;
      };
      console.error("创建需求失败:", axiosError.response?.data || axiosError.message);
      throw new Error(
        `创建需求失败: ${JSON.stringify(axiosError.response?.data || axiosError.message)}`,
      );
    }
  }

  /**
   * 关闭需求
   * @param params - 关闭需求参数
   * @returns 操作结果
   */
  async closeStory(params: CloseStoryParams): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/stories/${params.id}/close`, {
        closedReason: params.closedReason,
        comment: params.comment || "",
      });
      return true;
    } catch (error) {
      console.error("关闭需求失败:", error);
      return false;
    }
  }

  /**
   * 激活需求
   * @param storyID - 需求 ID
   * @param assignedTo - 指派给（可选）
   * @param comment - 备注（可选）
   * @returns 操作结果
   */
  async activateStory(storyID: number, assignedTo?: string, comment?: string): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/stories/${storyID}/activate`, {
        assignedTo: assignedTo || "",
        comment: comment || "",
      });
      return true;
    } catch (error) {
      console.error("激活需求失败:", error);
      return false;
    }
  }

  // ==================== 产品和项目相关方法 ====================

  /**
   * 获取产品列表
   * @param limit - 返回数量限制
   * @returns 产品列表
   */
  async getProducts(limit: number = 100): Promise<Product[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Product[]>> = await this.http.get(
      `/api.php/v1/products?limit=${limit}`,
    );
    return (
      response.data.data || (response.data as unknown as { products: Product[] }).products || []
    );
  }

  /**
   * 获取项目列表
   * @param limit - 返回数量限制
   * @returns 项目列表
   */
  async getProjects(limit: number = 100): Promise<Project[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Project[]>> = await this.http.get(
      `/api.php/v1/projects?limit=${limit}`,
    );
    return (
      response.data.data || (response.data as unknown as { projects: Project[] }).projects || []
    );
  }

  /**
   * 获取执行列表（迭代）
   * @param projectID - 项目 ID
   * @param limit - 返回数量限制
   * @returns 执行列表
   */
  async getExecutions(projectID: number, limit: number = 100): Promise<Project[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Project[]>> = await this.http.get(
      `/api.php/v1/projects/${projectID}/executions?limit=${limit}`,
    );
    return (
      response.data.data || (response.data as unknown as { executions: Project[] }).executions || []
    );
  }

  // ==================== 测试用例相关方法 ====================

  /**
   * 获取测试用例列表
   * @param productID - 产品 ID
   * @param limit - 返回数量限制
   * @returns 测试用例列表响应
   */
  async getTestCases(productID: number, limit: number = 100): Promise<TestCaseListResponse> {
    await this.ensureLogin();

    const response: AxiosResponse<TestCaseListResponse> = await this.http.get(
      `/api.php/v1/products/${productID}/testcases?limit=${limit}`,
    );
    return response.data;
  }

  /**
   * 获取测试用例详情
   * @param caseID - 用例 ID
   * @returns 测试用例详情
   */
  async getTestCase(caseID: number): Promise<TestCase | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<TestCase> = await this.http.get(
        `/api.php/v1/testcases/${caseID}`,
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * 创建测试用例
   * @param params - 创建测试用例参数
   * @returns 新创建的测试用例
   */
  async createTestCase(params: CreateTestCaseParams): Promise<TestCase> {
    await this.ensureLogin();

    const response: AxiosResponse<TestCase> = await this.http.post(
      `/api.php/v1/products/${params.product}/testcases`,
      {
        title: params.title,
        type: params.type,
        steps: params.steps,
        branch: params.branch || 0,
        module: params.module || 0,
        story: params.story || 0,
        stage: params.stage || "",
        precondition: params.precondition || "",
        pri: params.pri || 3,
        keywords: params.keywords || "",
      },
    );

    return response.data;
  }

  // ==================== Bug 更新相关方法 ====================

  /**
   * 更新 Bug
   * @param params - 更新 Bug 参数
   * @returns 更新后的 Bug
   */
  async updateBug(params: UpdateBugParams): Promise<Bug | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.title !== undefined) updateData.title = params.title;
    if (params.severity !== undefined) updateData.severity = params.severity;
    if (params.pri !== undefined) updateData.pri = params.pri;
    if (params.type !== undefined) updateData.type = params.type;
    if (params.module !== undefined) updateData.module = params.module;
    if (params.execution !== undefined) updateData.execution = params.execution;
    if (params.keywords !== undefined) updateData.keywords = params.keywords;
    if (params.os !== undefined) updateData.os = params.os;
    if (params.browser !== undefined) updateData.browser = params.browser;
    if (params.steps !== undefined) updateData.steps = params.steps;
    if (params.task !== undefined) updateData.task = params.task;
    if (params.story !== undefined) updateData.story = params.story;
    if (params.deadline !== undefined) updateData.deadline = params.deadline;
    if (params.openedBuild !== undefined) updateData.openedBuild = params.openedBuild;

    try {
      const response: AxiosResponse<ApiResponse<Bug>> = await this.http.put(
        `/api.php/v1/bugs/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Bug);
    } catch {
      return null;
    }
  }

  // ==================== 需求更新/变更相关方法 ====================

  /**
   * 更新需求
   * @param params - 更新需求参数
   * @returns 更新后的需求
   */
  async updateStory(params: UpdateStoryParams): Promise<Story | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.module !== undefined) updateData.module = params.module;
    if (params.source !== undefined) updateData.source = params.source;
    if (params.sourceNote !== undefined) updateData.sourceNote = params.sourceNote;
    if (params.pri !== undefined) updateData.pri = params.pri;
    if (params.category !== undefined) updateData.category = params.category;
    if (params.estimate !== undefined) updateData.estimate = params.estimate;
    if (params.keywords !== undefined) updateData.keywords = params.keywords;

    try {
      const response: AxiosResponse<ApiResponse<Story>> = await this.http.put(
        `/api.php/v1/stories/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Story);
    } catch {
      return null;
    }
  }

  /**
   * 变更需求（修改标题、描述、验收标准，会导致状态变为 changed）
   * @param params - 变更需求参数
   * @returns 变更后的需求
   */
  async changeStory(params: ChangeStoryParams): Promise<Story | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.title !== undefined) updateData.title = params.title;
    if (params.spec !== undefined) updateData.spec = params.spec;
    if (params.verify !== undefined) updateData.verify = params.verify;

    try {
      const response: AxiosResponse<ApiResponse<Story>> = await this.http.post(
        `/api.php/v1/stories/${params.id}/change`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Story);
    } catch {
      return null;
    }
  }

  // ==================== 产品详情/创建/更新相关方法 ====================

  /**
   * 获取产品详情
   * @param productID - 产品 ID
   * @returns 产品详情
   */
  async getProduct(productID: number): Promise<Product | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Product>> = await this.http.get(
        `/api.php/v1/products/${productID}`,
      );
      return response.data.data || (response.data as unknown as Product);
    } catch {
      return null;
    }
  }

  /**
   * 创建产品
   * @param params - 创建产品参数
   * @returns 新创建的产品
   */
  async createProduct(params: CreateProductParams): Promise<Product> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      name: params.name,
      code: params.code,
    };
    if (params.program !== undefined) data.program = params.program;
    if (params.line !== undefined) data.line = params.line;
    if (params.PO !== undefined) data.PO = params.PO;
    if (params.QD !== undefined) data.QD = params.QD;
    if (params.RD !== undefined) data.RD = params.RD;
    if (params.type !== undefined) data.type = params.type;
    if (params.desc !== undefined) data.desc = params.desc;
    if (params.acl !== undefined) data.acl = params.acl;
    if (params.whitelist !== undefined) data.whitelist = params.whitelist;

    const response: AxiosResponse<ApiResponse<Product>> = await this.http.post(
      "/api.php/v1/products",
      data,
    );
    return response.data.data || (response.data as unknown as Product);
  }

  /**
   * 更新产品
   * @param params - 更新产品参数
   * @returns 更新后的产品
   */
  async updateProduct(params: UpdateProductParams): Promise<Product | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.code !== undefined) updateData.code = params.code;
    if (params.program !== undefined) updateData.program = params.program;
    if (params.line !== undefined) updateData.line = params.line;
    if (params.type !== undefined) updateData.type = params.type;
    if (params.status !== undefined) updateData.status = params.status;
    if (params.desc !== undefined) updateData.desc = params.desc;
    if (params.PO !== undefined) updateData.PO = params.PO;
    if (params.QD !== undefined) updateData.QD = params.QD;
    if (params.RD !== undefined) updateData.RD = params.RD;
    if (params.acl !== undefined) updateData.acl = params.acl;
    if (params.whitelist !== undefined) updateData.whitelist = params.whitelist;

    try {
      const response: AxiosResponse<ApiResponse<Product>> = await this.http.put(
        `/api.php/v1/products/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Product);
    } catch {
      return null;
    }
  }

  // ==================== 项目详情/创建/更新相关方法 ====================

  /**
   * 获取项目详情
   * @param projectID - 项目 ID
   * @returns 项目详情
   */
  async getProject(projectID: number): Promise<Project | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Project>> = await this.http.get(
        `/api.php/v1/projects/${projectID}`,
      );
      return response.data.data || (response.data as unknown as Project);
    } catch {
      return null;
    }
  }

  /**
   * 创建项目
   * @param params - 创建项目参数
   * @returns 新创建的项目
   */
  async createProject(params: CreateProjectParams): Promise<Project> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Project>> = await this.http.post(
      "/api.php/v1/projects",
      {
        name: params.name,
        code: params.code,
        begin: params.begin,
        end: params.end,
        products: params.products,
        model: params.model || "scrum",
        parent: params.parent || 0,
      },
    );
    return response.data.data || (response.data as unknown as Project);
  }

  /**
   * 更新项目
   * @param params - 更新项目参数
   * @returns 更新后的项目
   */
  async updateProject(params: UpdateProjectParams): Promise<Project | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.code !== undefined) updateData.code = params.code;
    if (params.parent !== undefined) updateData.parent = params.parent;
    if (params.PM !== undefined) updateData.PM = params.PM;
    if (params.budget !== undefined) updateData.budget = params.budget;
    if (params.budgetUnit !== undefined) updateData.budgetUnit = params.budgetUnit;
    if (params.days !== undefined) updateData.days = params.days;
    if (params.desc !== undefined) updateData.desc = params.desc;
    if (params.acl !== undefined) updateData.acl = params.acl;
    if (params.whitelist !== undefined) updateData.whitelist = params.whitelist;
    if (params.auth !== undefined) updateData.auth = params.auth;

    try {
      const response: AxiosResponse<ApiResponse<Project>> = await this.http.put(
        `/api.php/v1/projects/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Project);
    } catch {
      return null;
    }
  }

  // ==================== 任务相关方法 ====================

  /**
   * 获取执行的任务列表
   * @param executionID - 执行 ID
   * @param limit - 返回数量限制
   * @returns 任务列表
   */
  async getTasks(executionID: number, limit: number = 100): Promise<Task[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Task[]>> = await this.http.get(
      `/api.php/v1/executions/${executionID}/tasks?limit=${limit}`,
    );
    return response.data.data || (response.data as unknown as { tasks: Task[] }).tasks || [];
  }

  /**
   * 获取任务详情
   * @param taskID - 任务 ID
   * @returns 任务详情
   */
  async getTask(taskID: number): Promise<Task | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Task>> = await this.http.get(
        `/api.php/v1/tasks/${taskID}`,
      );
      return response.data.data || (response.data as unknown as Task);
    } catch {
      return null;
    }
  }

  /**
   * 创建任务
   * @param params - 创建任务参数
   * @returns 新创建的任务
   */
  async createTask(params: CreateTaskParams): Promise<Task> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      name: params.name,
      type: params.type,
      assignedTo: params.assignedTo,
      estStarted: params.estStarted,
      deadline: params.deadline,
    };
    if (params.module !== undefined) data.module = params.module;
    if (params.story !== undefined) data.story = params.story;
    if (params.fromBug !== undefined) data.fromBug = params.fromBug;
    if (params.pri !== undefined) data.pri = params.pri;
    if (params.estimate !== undefined) data.estimate = params.estimate;
    if (params.desc !== undefined) data.desc = params.desc;

    const response: AxiosResponse<ApiResponse<Task>> = await this.http.post(
      `/api.php/v1/executions/${params.execution}/tasks`,
      data,
    );
    return response.data.data || (response.data as unknown as Task);
  }

  /**
   * 更新任务
   * @param params - 更新任务参数
   * @returns 更新后的任务
   */
  async updateTask(params: UpdateTaskParams): Promise<Task | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.type !== undefined) updateData.type = params.type;
    if (params.assignedTo !== undefined) updateData.assignedTo = params.assignedTo;
    if (params.module !== undefined) updateData.module = params.module;
    if (params.story !== undefined) updateData.story = params.story;
    if (params.fromBug !== undefined) updateData.fromBug = params.fromBug;
    if (params.pri !== undefined) updateData.pri = params.pri;
    if (params.estimate !== undefined) updateData.estimate = params.estimate;
    if (params.estStarted !== undefined) updateData.estStarted = params.estStarted;
    if (params.deadline !== undefined) updateData.deadline = params.deadline;
    if (params.desc !== undefined) updateData.desc = params.desc;

    try {
      const response: AxiosResponse<ApiResponse<Task>> = await this.http.put(
        `/api.php/v1/tasks/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Task);
    } catch {
      return null;
    }
  }

  // ==================== 用户相关方法 ====================

  /**
   * 获取用户列表
   * @param limit - 返回数量限制
   * @returns 用户列表
   */
  async getUsers(limit: number = 100): Promise<User[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<User[]>> = await this.http.get(
      `/api.php/v1/users?limit=${limit}`,
    );
    return response.data.data || (response.data as unknown as { users: User[] }).users || [];
  }

  /**
   * 获取用户详情
   * @param userID - 用户 ID
   * @returns 用户详情
   */
  async getUser(userID: number): Promise<User | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<User>> = await this.http.get(
        `/api.php/v1/users/${userID}`,
      );
      return response.data.data || (response.data as unknown as User);
    } catch {
      return null;
    }
  }

  /**
   * 获取当前登录用户信息
   * @returns 当前用户信息
   */
  async getMyProfile(): Promise<User | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<{ profile: User }>> =
        await this.http.get("/api.php/v1/user");
      return (
        response.data.data?.profile ||
        (response.data as unknown as { profile: User }).profile ||
        null
      );
    } catch {
      return null;
    }
  }

  /**
   * 创建用户
   * @param params - 创建用户参数
   * @returns 新创建的用户
   */
  async createUser(params: CreateUserParams): Promise<User> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      account: params.account,
      password: params.password,
      gender: params.gender || "m",
    };
    if (params.realname !== undefined) data.realname = params.realname;
    if (params.visions !== undefined) data.visions = params.visions;
    if (params.role !== undefined) data.role = params.role;
    if (params.dept !== undefined) data.dept = params.dept;
    if (params.email !== undefined) data.email = params.email;
    if (params.mobile !== undefined) data.mobile = params.mobile;
    if (params.phone !== undefined) data.phone = params.phone;
    if (params.weixin !== undefined) data.weixin = params.weixin;
    if (params.qq !== undefined) data.qq = params.qq;
    if (params.address !== undefined) data.address = params.address;
    if (params.join !== undefined) data.join = params.join;

    const response: AxiosResponse<ApiResponse<User>> = await this.http.post(
      "/api.php/v1/users",
      data,
    );
    return response.data.data || (response.data as unknown as User);
  }

  /**
   * 更新用户
   * @param params - 更新用户参数
   * @returns 更新后的用户
   */
  async updateUser(params: UpdateUserParams): Promise<User | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.realname !== undefined) updateData.realname = params.realname;
    if (params.role !== undefined) updateData.role = params.role;
    if (params.dept !== undefined) updateData.dept = params.dept;
    if (params.email !== undefined) updateData.email = params.email;
    if (params.gender !== undefined) updateData.gender = params.gender;
    if (params.mobile !== undefined) updateData.mobile = params.mobile;
    if (params.phone !== undefined) updateData.phone = params.phone;
    if (params.weixin !== undefined) updateData.weixin = params.weixin;
    if (params.qq !== undefined) updateData.qq = params.qq;
    if (params.address !== undefined) updateData.address = params.address;
    if (params.join !== undefined) updateData.join = params.join;
    if (params.password !== undefined) updateData.password = params.password;

    try {
      const response: AxiosResponse<ApiResponse<User>> = await this.http.put(
        `/api.php/v1/users/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as User);
    } catch {
      return null;
    }
  }

  // ==================== 项目集相关方法 ====================

  /**
   * 获取项目集列表
   * @param limit - 返回数量限制
   * @returns 项目集列表
   */
  async getPrograms(limit: number = 100): Promise<Program[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Program[]>> = await this.http.get(
      `/api.php/v1/programs?limit=${limit}`,
    );
    return (
      response.data.data || (response.data as unknown as { programs: Program[] }).programs || []
    );
  }

  /**
   * 获取项目集详情
   * @param programID - 项目集 ID
   * @returns 项目集详情
   */
  async getProgram(programID: number): Promise<Program | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Program>> = await this.http.get(
        `/api.php/v1/programs/${programID}`,
      );
      return response.data.data || (response.data as unknown as Program);
    } catch {
      return null;
    }
  }

  /**
   * 创建项目集
   * @param params - 创建项目集参数
   * @returns 新创建的项目集
   */
  async createProgram(params: CreateProgramParams): Promise<Program> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      name: params.name,
      begin: params.begin,
      end: params.end,
      parent: params.parent || 0,
    };
    if (params.PM !== undefined) data.PM = params.PM;
    if (params.budget !== undefined) data.budget = params.budget;
    if (params.budgetUnit !== undefined) data.budgetUnit = params.budgetUnit;
    if (params.desc !== undefined) data.desc = params.desc;
    if (params.acl !== undefined) data.acl = params.acl;
    if (params.whitelist !== undefined) data.whitelist = params.whitelist;

    const response: AxiosResponse<ApiResponse<Program>> = await this.http.post(
      "/api.php/v1/programs",
      data,
    );
    return response.data.data || (response.data as unknown as Program);
  }

  /**
   * 更新项目集
   * @param params - 更新项目集参数
   * @returns 更新后的项目集
   */
  async updateProgram(params: UpdateProgramParams): Promise<Program | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.parent !== undefined) updateData.parent = params.parent;
    if (params.PM !== undefined) updateData.PM = params.PM;
    if (params.budget !== undefined) updateData.budget = params.budget;
    if (params.budgetUnit !== undefined) updateData.budgetUnit = params.budgetUnit;
    if (params.desc !== undefined) updateData.desc = params.desc;
    if (params.begin !== undefined) updateData.begin = params.begin;
    if (params.end !== undefined) updateData.end = params.end;
    if (params.acl !== undefined) updateData.acl = params.acl;
    if (params.whitelist !== undefined) updateData.whitelist = params.whitelist;

    try {
      const response: AxiosResponse<ApiResponse<Program>> = await this.http.put(
        `/api.php/v1/programs/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Program);
    } catch {
      return null;
    }
  }

  // ==================== 计划相关方法 ====================

  /**
   * 获取产品计划列表
   * @param productID - 产品 ID
   * @param limit - 返回数量限制
   * @returns 计划列表
   */
  async getPlans(productID: number, limit: number = 100): Promise<Plan[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Plan[]>> = await this.http.get(
      `/api.php/v1/products/${productID}/plans?limit=${limit}`,
    );
    return response.data.data || (response.data as unknown as { plans: Plan[] }).plans || [];
  }

  /**
   * 获取计划详情
   * @param planID - 计划 ID
   * @returns 计划详情
   */
  async getPlan(planID: number): Promise<Plan | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Plan>> = await this.http.get(
        `/api.php/v1/productplans/${planID}`,
      );
      return response.data.data || (response.data as unknown as Plan);
    } catch {
      return null;
    }
  }

  /**
   * 创建计划
   * @param params - 创建计划参数
   * @returns 新创建的计划
   */
  async createPlan(params: CreatePlanParams): Promise<Plan> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      title: params.title,
    };
    if (params.begin !== undefined) data.begin = params.begin;
    if (params.end !== undefined) data.end = params.end;
    if (params.branch !== undefined) data.branch = params.branch;
    if (params.parent !== undefined) data.parent = params.parent;
    if (params.desc !== undefined) data.desc = params.desc;

    const response: AxiosResponse<ApiResponse<Plan>> = await this.http.post(
      `/api.php/v1/products/${params.product}/plans`,
      data,
    );
    return response.data.data || (response.data as unknown as Plan);
  }

  /**
   * 更新计划
   * @param params - 更新计划参数
   * @returns 更新后的计划
   */
  async updatePlan(params: UpdatePlanParams): Promise<Plan | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.title !== undefined) updateData.title = params.title;
    if (params.begin !== undefined) updateData.begin = params.begin;
    if (params.end !== undefined) updateData.end = params.end;
    if (params.branch !== undefined) updateData.branch = params.branch;
    if (params.desc !== undefined) updateData.desc = params.desc;

    try {
      const response: AxiosResponse<ApiResponse<Plan>> = await this.http.put(
        `/api.php/v1/productplans/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Plan);
    } catch {
      return null;
    }
  }

  /**
   * 计划关联需求
   * @param planID - 计划 ID
   * @param stories - 需求 ID 列表
   * @returns 是否成功
   */
  async linkStoriesToPlan(planID: number, stories: number[]): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/productplans/${planID}/linkstories`, {
        stories,
      });
      return true;
    } catch (error) {
      console.error("计划关联需求失败:", error);
      return false;
    }
  }

  /**
   * 计划取消关联需求
   * @param planID - 计划 ID
   * @param stories - 需求 ID 列表
   * @returns 是否成功
   */
  async unlinkStoriesFromPlan(planID: number, stories: number[]): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/productplans/${planID}/unlinkstories`, {
        stories,
      });
      return true;
    } catch (error) {
      console.error("计划取消关联需求失败:", error);
      return false;
    }
  }

  /**
   * 计划关联 Bug
   * @param planID - 计划 ID
   * @param bugs - Bug ID 列表
   * @returns 是否成功
   */
  async linkBugsToPlan(planID: number, bugs: number[]): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/productplans/${planID}/linkbugs`, {
        bugs,
      });
      return true;
    } catch (error) {
      console.error("计划关联 Bug 失败:", error);
      return false;
    }
  }

  /**
   * 计划取消关联 Bug
   * @param planID - 计划 ID
   * @param bugs - Bug ID 列表
   * @returns 是否成功
   */
  async unlinkBugsFromPlan(planID: number, bugs: number[]): Promise<boolean> {
    await this.ensureLogin();

    try {
      await this.http.post(`/api.php/v1/productplans/${planID}/unlinkbugs`, {
        bugs,
      });
      return true;
    } catch (error) {
      console.error("计划取消关联 Bug 失败:", error);
      return false;
    }
  }

  // ==================== 发布相关方法 ====================

  /**
   * 获取项目发布列表
   * @param projectID - 项目 ID
   * @returns 发布列表
   */
  async getProjectReleases(projectID: number): Promise<Release[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Release[]>> = await this.http.get(
      `/api.php/v1/projects/${projectID}/releases`,
    );
    return (
      response.data.data || (response.data as unknown as { releases: Release[] }).releases || []
    );
  }

  /**
   * 获取产品发布列表
   * @param productID - 产品 ID
   * @returns 发布列表
   */
  async getProductReleases(productID: number): Promise<Release[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Release[]>> = await this.http.get(
      `/api.php/v1/products/${productID}/releases`,
    );
    return (
      response.data.data || (response.data as unknown as { releases: Release[] }).releases || []
    );
  }

  // ==================== 版本相关方法 ====================

  /**
   * 获取项目版本列表
   * @param projectID - 项目 ID
   * @returns 版本列表
   */
  async getProjectBuilds(projectID: number): Promise<Build[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Build[]>> = await this.http.get(
      `/api.php/v1/projects/${projectID}/builds`,
    );
    return response.data.data || (response.data as unknown as { builds: Build[] }).builds || [];
  }

  /**
   * 获取执行版本列表
   * @param executionID - 执行 ID
   * @returns 版本列表
   */
  async getExecutionBuilds(executionID: number): Promise<Build[]> {
    await this.ensureLogin();

    const response: AxiosResponse<ApiResponse<Build[]>> = await this.http.get(
      `/api.php/v1/executions/${executionID}/builds`,
    );
    return response.data.data || (response.data as unknown as { builds: Build[] }).builds || [];
  }

  /**
   * 获取版本详情
   * @param buildID - 版本 ID
   * @returns 版本详情
   */
  async getBuild(buildID: number): Promise<Build | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Build>> = await this.http.get(
        `/api.php/v1/builds/${buildID}`,
      );
      return response.data.data || (response.data as unknown as Build);
    } catch {
      return null;
    }
  }

  /**
   * 创建版本
   * @param params - 创建版本参数
   * @returns 新创建的版本
   */
  async createBuild(params: CreateBuildParams): Promise<Build> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      name: params.name,
      execution: params.execution,
      product: params.product,
      builder: params.builder,
    };
    if (params.branch !== undefined) data.branch = params.branch;
    if (params.date !== undefined) data.date = params.date;
    if (params.scmPath !== undefined) data.scmPath = params.scmPath;
    if (params.filePath !== undefined) data.filePath = params.filePath;
    if (params.desc !== undefined) data.desc = params.desc;

    const response: AxiosResponse<ApiResponse<Build>> = await this.http.post(
      `/api.php/v1/projects/${params.project}/builds`,
      data,
    );
    return response.data.data || (response.data as unknown as Build);
  }

  /**
   * 更新版本
   * @param params - 更新版本参数
   * @returns 更新后的版本
   */
  async updateBuild(params: UpdateBuildParams): Promise<Build | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.scmPath !== undefined) updateData.scmPath = params.scmPath;
    if (params.filePath !== undefined) updateData.filePath = params.filePath;
    if (params.desc !== undefined) updateData.desc = params.desc;
    if (params.builder !== undefined) updateData.builder = params.builder;
    if (params.date !== undefined) updateData.date = params.date;

    try {
      const response: AxiosResponse<ApiResponse<Build>> = await this.http.put(
        `/api.php/v1/builds/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Build);
    } catch {
      return null;
    }
  }

  // ==================== 执行（迭代）相关方法 ====================

  /**
   * 获取执行详情
   * @param executionID - 执行 ID
   * @returns 执行详情
   */
  async getExecution(executionID: number): Promise<Execution | null> {
    await this.ensureLogin();

    try {
      const response: AxiosResponse<ApiResponse<Execution>> = await this.http.get(
        `/api.php/v1/executions/${executionID}`,
      );
      return response.data.data || (response.data as unknown as Execution);
    } catch {
      return null;
    }
  }

  /**
   * 创建执行
   * @param params - 创建执行参数
   * @returns 新创建的执行
   */
  async createExecution(params: CreateExecutionParams): Promise<Execution> {
    await this.ensureLogin();

    const data: Record<string, unknown> = {
      name: params.name,
      code: params.code,
      begin: params.begin,
      end: params.end,
    };
    if (params.days !== undefined) data.days = params.days;
    if (params.lifetime !== undefined) data.lifetime = params.lifetime;
    if (params.PO !== undefined) data.PO = params.PO;
    if (params.PM !== undefined) data.PM = params.PM;
    if (params.QD !== undefined) data.QD = params.QD;
    if (params.RD !== undefined) data.RD = params.RD;
    if (params.teamMembers !== undefined) data.teamMembers = params.teamMembers;
    if (params.desc !== undefined) data.desc = params.desc;
    if (params.acl !== undefined) data.acl = params.acl;
    if (params.whitelist !== undefined) data.whitelist = params.whitelist;

    const response: AxiosResponse<ApiResponse<Execution>> = await this.http.post(
      `/api.php/v1/projects/${params.project}/executions`,
      data,
    );
    return response.data.data || (response.data as unknown as Execution);
  }

  /**
   * 更新执行
   * @param params - 更新执行参数
   * @returns 更新后的执行
   */
  async updateExecution(params: UpdateExecutionParams): Promise<Execution | null> {
    await this.ensureLogin();

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.code !== undefined) updateData.code = params.code;
    if (params.begin !== undefined) updateData.begin = params.begin;
    if (params.end !== undefined) updateData.end = params.end;
    if (params.days !== undefined) updateData.days = params.days;
    if (params.lifetime !== undefined) updateData.lifetime = params.lifetime;
    if (params.PO !== undefined) updateData.PO = params.PO;
    if (params.PM !== undefined) updateData.PM = params.PM;
    if (params.QD !== undefined) updateData.QD = params.QD;
    if (params.RD !== undefined) updateData.RD = params.RD;
    if (params.teamMembers !== undefined) updateData.teamMembers = params.teamMembers;
    if (params.desc !== undefined) updateData.desc = params.desc;
    if (params.acl !== undefined) updateData.acl = params.acl;
    if (params.whitelist !== undefined) updateData.whitelist = params.whitelist;

    try {
      const response: AxiosResponse<ApiResponse<Execution>> = await this.http.put(
        `/api.php/v1/executions/${params.id}`,
        updateData,
      );
      return response.data.data || (response.data as unknown as Execution);
    } catch {
      return null;
    }
  }

  // ==================== 文档相关方法（内置 API）====================

  /**
   * 获取文档空间数据（文档库、目录树、文档列表）
   * @param type - 空间类型: product 或 project
   * @param spaceID - 空间 ID（产品或项目 ID）
   * @returns 文档空间数据
   */
  async getDocSpaceData(type: "product" | "project", spaceID: number): Promise<DocSpaceData> {
    return this.legacyClient.getDocSpaceData(type, spaceID);
  }

  /**
   * 获取文档详情
   * @param docID - 文档 ID
   * @param version - 版本号（0 表示最新版本）
   * @returns 文档详情
   */
  async getDoc(docID: number, version: number = 0): Promise<Doc | null> {
    return this.legacyClient.getDoc(docID, version);
  }

  /**
   * 创建文档
   * @param params - 创建文档参数
   * @returns 创建结果
   */
  async createDoc(params: CreateDocParams): Promise<{ id: number; doc: Doc }> {
    return this.legacyClient.createDoc(params);
  }

  /**
   * 编辑文档
   * @param params - 编辑文档参数
   * @returns 更新后的文档
   */
  async editDoc(params: EditDocParams): Promise<Doc | null> {
    return this.legacyClient.editDoc(params);
  }

  /**
   * 创建文档目录
   * @param params - 创建目录参数
   * @returns 创建结果
   */
  async createDocModule(params: CreateDocModuleParams): Promise<{ id: number; name: string }> {
    return this.legacyClient.createDocModule(params);
  }

  /**
   * 编辑文档目录
   * @param params - 编辑目录参数
   * @returns 操作结果
   */
  async editDocModule(params: EditDocModuleParams): Promise<boolean> {
    return this.legacyClient.editDocModule(params);
  }

  // ==================== 文件相关方法（内置 API）====================

  /**
   * 读取文件
   * @param fileID - 文件 ID
   * @param fileType - 文件类型
   * @returns 文件内容
   */
  async readFile(fileID: number, fileType: string): Promise<ZentaoFileReadResult> {
    return this.legacyClient.readFile(fileID, fileType);
  }
}

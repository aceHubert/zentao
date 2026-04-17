import axios from "axios";
import CryptoJS from "crypto-js";
import ZentaoV1 from "../src/zentao-v1";

jest.mock("axios");

describe("ZentaoV1", () => {
  const get = jest.fn();
  const post = jest.fn();
  const put = jest.fn();
  const del = jest.fn();
  const defaults = { headers: { common: {} } };

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockReset();
    post.mockReset();
    put.mockReset();
    del.mockReset();
    (axios.create as jest.Mock).mockReturnValue({
      get,
      post,
      put,
      delete: del,
      defaults,
    });
  });

  const createClient = () =>
    new ZentaoV1({
      url: "https://pro.demo.zentao.net/",
      account: "demo",
      password: "123456",
    });

  it("login 应调用 tokens 接口并保存 Token", async () => {
    post.mockResolvedValueOnce({
      data: {
        token: "token-123",
      },
    });

    const client = createClient();
    const token = await client.login();

    expect(token).toBe("token-123");
    expect(post).toHaveBeenCalledWith("/api.php/v1/tokens", {
      account: "demo",
      password: CryptoJS.MD5("123456").toString(),
    });
    expect((defaults.headers.common as Record<string, string>).Token).toBe("token-123");
  });

  it("getBugs 应先登录再请求产品 Bug 列表", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    get.mockResolvedValueOnce({
      data: {
        bugs: [{ id: 1, title: "bug" }],
      },
    });

    const client = createClient();
    const result = await client.getBugs(1, "unclosed", 20);

    expect(result).toStrictEqual([{ id: 1, title: "bug" }]);
    expect(get).toHaveBeenCalledWith("/api.php/v1/products/1/bugs?browseType=unclosed&limit=20");
  });

  it("createBug 应调用产品下的创建接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    post.mockResolvedValueOnce({
      data: {
        data: { id: 2, title: "new bug" },
      },
    });

    const client = createClient();
    const result = await client.createBug({
      product: 3,
      title: "new bug",
      severity: 3,
    });

    expect(result).toStrictEqual({ id: 2, title: "new bug" });
    expect(post).toHaveBeenNthCalledWith(2, "/api.php/v1/products/3/bugs", {
      title: "new bug",
      severity: 3,
    });
  });

  it("resolveBug 应调用 Bug 解决接口并返回成功状态", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    post.mockResolvedValueOnce({
      data: {
        result: "success",
      },
    });

    const client = createClient();
    const result = await client.resolveBug({
      id: 9,
      resolution: "fixed",
    });

    expect(result).toBe(true);
    expect(post).toHaveBeenNthCalledWith(2, "/api.php/v1/bugs/9/resolve", {
      resolution: "fixed",
    });
  });

  it("pauseTask 应调用任务暂停接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    post.mockResolvedValueOnce({ data: { result: "success" } });

    const client = createClient();
    const result = await client.pauseTask({ id: 15, comment: "pause" });

    expect(result).toBe(true);
    expect(post).toHaveBeenNthCalledWith(2, "/api.php/v1/tasks/15/pause", {
      comment: "pause",
    });
  });

  it("getProducts 应请求产品列表", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    get.mockResolvedValueOnce({
      data: {
        data: [{ id: 1, name: "产品A" }],
      },
    });

    const client = createClient();
    const result = await client.getProducts();

    expect(result).toStrictEqual([{ id: 1, name: "产品A" }]);
    expect(get).toHaveBeenCalledWith("/api.php/v1/products?limit=100");
  });

  it("deleteBug 应调用删除接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    del.mockResolvedValueOnce({ data: { result: "success" } });

    const client = createClient();
    const result = await client.deleteBug(7);

    expect(result).toBe(true);
    expect(del).toHaveBeenCalledWith("/api.php/v1/bugs/7");
  });

  it("runTestCase 应调用用例执行接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    post.mockResolvedValueOnce({ data: { result: "success" } });

    const client = createClient();
    const result = await client.runTestCase({
      id: 12,
      status: "pass",
    });

    expect(result).toBe(true);
    expect(post).toHaveBeenNthCalledWith(2, "/api.php/v1/testcases/12/run", {
      status: "pass",
    });
  });

  it("assignFeedback 应调用反馈指派接口", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    post.mockResolvedValueOnce({ data: { result: "success" } });

    const client = createClient();
    const result = await client.assignFeedback({
      id: 5,
      assignedTo: "admin",
    });

    expect(result).toBe(true);
    expect(post).toHaveBeenNthCalledWith(2, "/api.php/v1/feedbacks/5/assign", {
      assignedTo: "admin",
      comment: undefined,
    });
  });

  it("getDepts 应请求部门列表", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-123" } });
    get.mockResolvedValueOnce({ data: { depts: [{ id: 3, name: "研发部" }] } });

    const client = createClient();
    const result = await client.getDepts(50);

    expect(result).toStrictEqual([{ id: 3, name: "研发部" }]);
    expect(get).toHaveBeenCalledWith("/api.php/v1/depts?limit=50");
  });

  it("getToken 应复用登录流程", async () => {
    post.mockResolvedValueOnce({ data: { token: "token-xyz" } });

    const client = createClient();
    const result = await client.getToken();

    expect(result).toBe("token-xyz");
  });
});

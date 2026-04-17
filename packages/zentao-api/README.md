# 禅道 API 调用模块

`@ace-zentao/api` 提供了 4 套客户端：

- `Zentao`：通用底层请求封装，适合直接按模块/方法调用。
- `zentao-legacy`：基于旧版内置接口 `/index.php?m=xxx&f=xxx` 的高层封装。
- `zentao-v1`：对应导出类 `ZentaoV1`，基于 REST API v1 的业务封装。
- `zentao-v2`：对应导出类 `ZentaoV2`，基于 REST API v2 的业务封装。

## 安装

```bash
npm install --save @ace-zentao/api
```

## 导入示例

```ts
import { Zentao, ZentaoLegacy, ZentaoV1, ZentaoV2 } from "@ace-zentao/api";
```

## 快速开始

### 1. 使用通用客户端

```ts
import { Zentao } from "@ace-zentao/api";

const client = new Zentao({
  url: "https://zentao.example.com/",
  account: "demo",
  password: "123456",
});

const result = await client.request("bug", "browse", {
  params: [["productID", 1]],
});
```

### 2. 使用 REST API v1 客户端

```ts
import { ZentaoV1 } from "@ace-zentao/api";

const client = new ZentaoV1({
  url: "https://zentao.example.com/",
  account: "demo",
  password: "123456",
});

const bugs = await client.getBugs(1, "unclosed", 20);
```

### 3. 使用 REST API v2 客户端

```ts
import { ZentaoV2 } from "@ace-zentao/api";

const client = new ZentaoV2({
  url: "https://zentao.example.com/",
  account: "demo",
  password: "123456",
});

const products = await client.getProducts(20);
```

## 各版本可用接口方法

以下方法清单按当前 `packages/zentao-api/src` 源码整理。

### Zentao

通用底层能力，适合需要自由拼装模块名、方法名和参数时使用。

- 通用：`login`、`fetchConfig`、`module`、`m`、`request`

### ZentaoLegacy

适合旧版内置接口和文档相关能力。

- 部门：`getDeptList`、`addDept`
- 用户：`getUserList`、`getUserCreateParams`、`addUser`
- 产品：`getProductList`、`getProduct`、`getProductCreateParams`、`addProduct`
- 项目：`getProjectList`、`getProject`、`getProjectCreateParams`、`addProject`
- 任务：`getTaskList`、`getTask`、`getTaskCreateParams`、`addTask`、`getTaskFinishParams`、`finishTask`
- Bug：`getBugList`、`getBug`、`getBugCreateParams`、`addBug`、`getBugResolveParams`、`resolveBug`
- 文档与文件：`getDocSpaceData`、`getDoc`、`createDoc`、`editDoc`、`createDocModule`、`editDocModule`、`readFile`
- 动态调用：`call`

### ZentaoV1

基于 REST API v1 的完整业务封装。

- 认证与会话：`login`、`getToken`
- Bug：`getBugs`、`getAssignedBugs`、`getBug`、`createBug`、`updateBug`、`deleteBug`、`resolveBug`、`closeBug`、`activateBug`、`confirmBug`
- 需求：`getStories`、`getProjectStories`、`getExecutionStories`、`getStory`、`createStory`、`updateStory`、`changeStory`、`closeStory`、`activateStory`、`deleteStory`
- 产品：`getProducts`、`getProduct`、`createProduct`、`updateProduct`、`deleteProduct`
- 项目：`getProjects`、`getProject`、`createProject`、`updateProject`、`deleteProject`
- 执行：`getExecutions`、`getExecution`、`createExecution`、`updateExecution`、`deleteExecution`
- 任务：`getTasks`、`getTask`、`createTask`、`updateTask`、`startTask`、`pauseTask`、`resumeTask`、`finishTask`、`closeTask`、`getTaskLogs`、`createTaskLog`
- 用例：`getTestCases`、`getTestCase`、`createTestCase`、`updateTestCase`、`deleteTestCase`、`runTestCase`
- 测试单：`getTestTasks`、`getProjectTestTasks`、`getExecutionTestTasks`、`getTestTask`
- 用户：`getUsers`、`getUser`、`getMyProfile`、`createUser`、`updateUser`、`deleteUser`
- 部门：`getDepts`、`getDept`
- 项目集：`getPrograms`、`getProgram`、`createProgram`、`updateProgram`
- 产品计划：`getPlans`、`getPlan`、`createPlan`、`updatePlan`、`linkStoriesToPlan`、`unlinkStoriesFromPlan`、`linkBugsToPlan`、`unlinkBugsFromPlan`
- 发布与构建：`getProjectReleases`、`getProductReleases`、`getProjectBuilds`、`getExecutionBuilds`、`getBuild`、`createBuild`、`updateBuild`、`deleteBuild`
- 反馈：`createFeedback`、`assignFeedback`、`closeFeedback`、`deleteFeedback`、`updateFeedback`、`getFeedback`、`getFeedbacks`
- 工单：`getTickets`、`getTicket`、`createTicket`、`updateTicket`、`deleteTicket`

### ZentaoV2

基于 REST API v2 的业务封装，接口覆盖面与 v1 接近，但细节能力以官方 v2 为准。

- 认证与会话：`login`、`getToken`
- Bug：`getBugs`、`getAssignedBugs`、`getBug`、`createBug`、`updateBug`、`resolveBug`、`closeBug`、`activateBug`、`deleteBug`
- 需求：`getStories`、`getStory`、`createStory`、`updateStory`、`changeStory`、`closeStory`、`activateStory`、`deleteStory`
- 产品：`getProducts`、`getProduct`、`createProduct`、`updateProduct`、`deleteProduct`
- 项目：`getProjects`、`getProject`、`createProject`、`updateProject`、`deleteProject`
- 执行：`getExecutions`、`getExecution`、`createExecution`、`updateExecution`、`deleteExecution`
- 任务：`getTasks`、`getTask`、`createTask`、`updateTask`、`startTask`、`finishTask`、`closeTask`、`activateTask`、`deleteTask`
- 用例：`getTestCases`、`getTestCase`、`createTestCase`、`updateTestCase`、`deleteTestCase`、`runTestCase`
- 测试单：`getTestTasks`、`getProjectTestTasks`、`getExecutionTestTasks`、`getTestTask`、`createTestTask`、`updateTestTask`、`deleteTestTask`
- 用户：`getUsers`、`getUser`、`getMyProfile`、`createUser`、`updateUser`、`deleteUser`
- 项目集：`getPrograms`、`getProgram`、`createProgram`、`updateProgram`、`deleteProgram`
- 产品计划：`getPlans`、`getPlan`、`createPlan`、`updatePlan`、`deletePlan`、`linkStoriesToPlan`、`unlinkStoriesFromPlan`、`linkBugsToPlan`、`unlinkBugsFromPlan`
- 发布与构建：`getProjectReleases`、`getProductReleases`、`createRelease`、`updateRelease`、`deleteRelease`、`getProjectBuilds`、`getExecutionBuilds`、`getBuild`、`createBuild`、`updateBuild`
- 应用：`createSystem`、`updateSystem`、`getProductSystems`
- 反馈：`getFeedbacks`、`getFeedback`、`createFeedback`、`updateFeedback`、`assignFeedback`、`closeFeedback`、`deleteFeedback`
- 工单：`getTickets`、`getTicket`、`createTicket`、`updateTicket`、`closeTicket`、`activateTicket`、`deleteTicket`

## 选择建议

- 需要底层自由拼装：优先用 `Zentao`
- 需要旧版内置接口、文档空间、附件读取：优先用 `ZentaoLegacy`
- 对接稳定的 REST v1：优先用 `zentao-v1`，对应导出类 `ZentaoV1`
- 明确使用官方 REST v2：优先用 `zentao-v2`，对应导出类 `ZentaoV2`

## 说明

- 方法清单以当前源码为准，后续新增能力时请同步更新本 README。
- 各方法的参数结构可以直接查看对应源码文件：
  - `src/zentao.ts`
  - `src/zentao-legacy.ts`
  - `src/zentao-v1.ts`
  - `src/zentao-v2.ts`

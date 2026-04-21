# 禅道 MCP

让 AI 助手能够直接管理禅道中的 Bug、需求、测试用例、文档、产品、项目、用户和附件。

本项目提供两种使用方式：

- **MCP Server**：接入 Cursor、Claude Desktop、Codex 等支持 MCP 的 AI 客户端。
- **CLI 命令行**：通过 `zentao` 命令在终端中直接查询和维护禅道数据。

## ✨ 功能特性

- 支持禅道 REST API v1、REST API v2 和内置 API。
- 支持 Bug 查询、创建、解决、关闭。
- 支持需求查询、创建、关闭。
- 支持测试用例查询、创建。
- 支持产品、项目、用户查询。
- 支持文档空间树、文档详情、文档创建/编辑、目录创建/编辑。
- 支持附件和图片读取。
- 支持自签名证书环境。
- 提供 AI skills，帮助助手按正确流程使用禅道 MCP 和 CLI。

## 📦 安装

### 环境要求

- Node.js >= 18
- npm、yarn、pnpm 中任意一种包管理器
- 一个可访问目标禅道系统的账号

### 直接通过 npx 使用

推荐在 MCP 客户端中使用 `npx`，无需全局安装：

```bash
npx -y @acehubert/zentao-mcp@latest
```

### 全局安装 CLI

如果需要在终端中直接使用 `zentao` 命令：

```bash
npm i -g @acehubert/zentao-mcp@latest
zentao --version
```

如果提示 `command not found`，请确认 npm 全局 `bin` 目录已加入 `PATH`。

### 本地开发安装

克隆仓库后安装依赖并构建：

```bash
yarn install
yarn build
```

常用开发命令：

```bash
yarn typecheck
yarn lint
yarn test
```

## ⚙️ 连接配置

MCP Server 和 CLI 都支持通过环境变量配置禅道连接信息：

```bash
export ZENTAO_URL="https://zentao.example.com"
export ZENTAO_ACCOUNT="your_account"
export ZENTAO_PASSWORD="your_password"
export ZENTAO_VERSION="v2"
export ZENTAO_SKIP_SSL="false"
```

配置项说明：

- `ZENTAO_URL`：禅道访问地址，例如 `https://zentao.example.com`。
- `ZENTAO_ACCOUNT`：禅道账号。
- `ZENTAO_PASSWORD`：禅道密码。
- `ZENTAO_VERSION`：禅道 API 类型，可选 `legacy`、`v1`、`v2`。
- `ZENTAO_SKIP_SSL`：是否跳过 SSL 证书校验。自签名证书内网环境可设为 `true`。

> 注意：不要把 `ZENTAO_PASSWORD` 提交到仓库，也不要写入公开日志。

## 🤖 MCP 使用说明

在支持 MCP 的客户端中添加如下配置：

```json
{
  "mcpServers": {
    "zentao": {
      "command": "npx",
      "args": ["-y", "@acehubert/zentao-mcp@latest"],
      "env": {
        "ZENTAO_URL": "https://zentao.example.com",
        "ZENTAO_ACCOUNT": "your_account",
        "ZENTAO_PASSWORD": "your_password",
        "ZENTAO_VERSION": "v2",
        "ZENTAO_SKIP_SSL": "false"
      }
    }
  }
}
```

配置完成后，AI 客户端会获得以下 MCP 工具：

- `zentao_bugs`：Bug 列表、详情、创建、解决、关闭。
- `zentao_stories`：需求列表、详情、创建、关闭。
- `zentao_testcases`：测试用例列表、详情、创建。
- `zentao_products`：产品列表、详情。
- `zentao_projects`：项目列表、详情。
- `zentao_users`：当前用户、用户列表、用户详情。
- `zentao_docs`：文档空间树、文档详情、文档创建/编辑、目录创建/编辑。
- `zentao_file`：附件和图片读取。

本项目采用统一 action 模式。先选择资源工具，再通过 `action` 指定操作。

示例：

```json
{
  "action": "list",
  "productID": 1,
  "browseType": "unclosed",
  "limit": 20
}
```

常见工作流：

1. 先用 `list`、`tree` 或 `view` 定位目标 ID。
2. 再执行 `create`、`edit`、`resolve`、`close` 等写操作。
3. 写操作完成后，再次用 `view` 验证结果。

## 💻 CLI 使用说明

安装后可使用：

```bash
zentao <resource> <action> [arguments] [flags]
```

查看帮助：

```bash
zentao --help
zentao bugs --help
zentao docs --help
```

### Bug

```bash
zentao bugs list --productID 1 --browseType unclosed --limit 20
zentao bugs view --bugID 123
```

`browseType` 表示 Bug 状态，默认 `unclosed`：

- v1/v2：`all` 全部、`unclosed` 未关闭、`assignedtome` 指派给我、`openedbyme` 我创建、`assignedbyme` 由我指派。
- legacy：`all` 所有、`unclosed` 未关闭、`openedbyme` 由我创建、`assigntome` 指派给我、`resolvedbyme` 由我解决、`toclosed` 待关闭、`unresolved` 未解决、`unconfirmed` 未确认、`longlifebugs` 久未处理、`postponedbugs` 被延期、`overduebugs` 过期 BUG、`needconfirm` 需求变动。

创建 Bug：

```bash
zentao bugs create \
  --productID 1 \
  --title "登录按钮点击后无响应" \
  --severity 2 \
  --pri 2 \
  --type codeerror \
  --steps "【前置条件】进入登录页\n【操作步骤】点击登录按钮\n【预期结果】正常提交\n【实际结果】无响应"
```

解决和关闭 Bug：

```bash
zentao bugs resolve --bugID 123 --resolution fixed --comment "已修复，待验证"
zentao bugs close --bugID 123 --comment "验证通过"
```

### 需求

```bash
zentao stories list --productID 1 --browseType unclosed --limit 20
zentao stories view --storyID 456
```

需求列表的 `browseType` 默认 `unclosed`。v1/v2 可用值：`all` 全部、`unclosed` 未关闭、`assignedtome` 指派给我、`openedbyme` 我创建、`assignedbyme` 由我指派。

创建需求：

```bash
zentao stories create \
  --productID 1 \
  --title "优化登录流程" \
  --category feature \
  --pri 2 \
  --spec "用户可以通过手机号和验证码登录" \
  --reviewer "zhangsan" \
  --verify "输入正确验证码后登录成功"
```

关闭需求：

```bash
zentao stories close --storyID 456 --closedReason done --comment "需求已完成"
```

### 测试用例

`steps` 参数需要传入 JSON 数组字符串：

```bash
zentao testcases list --productID 1 --limit 20
zentao testcases view --caseID 789

zentao testcases create \
  --productID 1 \
  --title "手机号验证码登录成功" \
  --type feature \
  --pri 2 \
  --steps '[{"desc":"输入手机号","expect":"手机号格式正确"},{"desc":"输入验证码并提交","expect":"登录成功"}]'
```

### 产品、项目、用户

```bash
zentao products list --limit 20
zentao products view --productID 1

zentao projects list --limit 20
zentao projects view --projectID 1

zentao users me
zentao users list --limit 20
zentao users view --userID 1
```

### 文档

文档操作依赖文档库 ID 和目录 ID。写入前建议先查询空间树：

```bash
zentao docs tree --spaceType product --spaceID 1
zentao docs view --docID 1001
```

创建目录和文档：

```bash
zentao docs createModule \
  --libID 1 \
  --spaceID 1 \
  --moduleName "接口文档"

zentao docs create \
  --libID 1 \
  --moduleID 111 \
  --title "登录接口文档" \
  --content "接口地址、请求参数、响应格式..."
```

编辑文档和目录：

```bash
zentao docs edit \
  --docID 1001 \
  --title "登录接口文档" \
  --content "更新后的文档内容"

zentao docs editModule \
  --moduleID 111 \
  --libID 1 \
  --moduleName "登录接口"
```

## 🧩 API 版本选择

不同禅道部署可能支持不同 API：

- `v2`：优先推荐，适合较新的禅道 REST API。
- `v1`：适合使用 `/api.php/v1/...` 的禅道 REST API。
- `legacy`：适合只支持传统内置 API 的部署。

如果遇到接口不存在或鉴权异常，可以依次尝试：

```bash
export ZENTAO_VERSION="v2"
export ZENTAO_VERSION="v1"
export ZENTAO_VERSION="legacy"
```

## 🔐 安全建议

- 不要把禅道账号密码写入 README、脚本或仓库配置。
- 优先通过 MCP 客户端 `env` 或本地 shell 环境变量传入密码。
- 执行批量关闭、批量解决、批量编辑前，先确认目标 ID 和影响范围。
- 生产环境写操作建议遵循 `查询 -> 确认 -> 写入 -> 验证` 的流程。
- `ZENTAO_SKIP_SSL=true` 只建议用于可信内网的自签名证书环境。

## ❓ 常见问题

### MCP Server 启动失败

请检查：

- `ZENTAO_URL` 是否可访问。
- `ZENTAO_ACCOUNT` 和 `ZENTAO_PASSWORD` 是否正确。
- `ZENTAO_VERSION` 是否匹配目标禅道版本。
- 自签名证书环境是否需要设置 `ZENTAO_SKIP_SSL=true`。

### CLI 找不到 `zentao` 命令

请确认已经全局安装：

```bash
npm i -g @acehubert/zentao-mcp@latest
```

如果仍然找不到命令，请检查 npm 全局 `bin` 目录是否在 `PATH` 中。

### 文档创建失败

请先执行：

```bash
zentao docs tree --spaceType product --spaceID 1
```

确认 `libID`、`moduleID` 和目标文档空间后再创建或编辑。

### 权限不足

请确认配置的禅道账号拥有目标产品、项目、文档库或附件的访问权限。

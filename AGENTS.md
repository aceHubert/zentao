# Zentao MCP Server - AI 开发助手指南

## 项目概述

这是一个禅道 MCP (Model Context Protocol) Server 项目，让 AI 助手能够直接管理禅道中的 Bug、需求、测试用例和文档。

## 技术栈

- **语言**: TypeScript
- **运行时**: Node.js
- **框架**: @modelcontextprotocol/sdk
- **HTTP 客户端**: Axios
- **构建工具**: esbuild (ESM + CJS 双格式)

## 项目结构

```
zentao/
├── packages/
│   └── zentao-mcp/
│       ├── src/
│       │   ├── index.ts                # MCP Server 入口，注册所有 tools
│       │   ├── types.ts                # TypeScript 类型定义
│       │   └── zentao-clients/         # 禅道 API 客户端实现
│       │       ├── client.interface.ts # 客户端接口定义
│       │       ├── client-legacy.ts    # 内置 API 客户端
│       │       ├── client-v1.ts        # REST API v1 客户端
│       │       ├── client-v2.ts        # REST API v2 客户端
│       │       └── index.ts            # 客户端导出入口
│       ├── package.json                # 发布包配置
│       └── tsconfig.json               # 子包 TypeScript 配置
├── README.md                           # 仓库文档
├── package.json                        # Monorepo workspace 配置
└── tsconfig.base.json                  # 共享 TypeScript 配置
```

## 开发规范

### 代码风格

1. **注释规范**: 使用 JSDoc 风格注释导出的函数和接口
2. **命名规范**:
   - 工具名: `zentao_{action}_{resource}` 或 `zentao_{resource}` (使用 action 参数)
   - 类型名: PascalCase
   - 变量/函数: camelCase
3. **简洁原则**: 优先使用简单直接的方法实现需求

### 工具设计模式

本项目使用 **统一 action 模式**，将相关操作合并到单个工具中：

```typescript
// ✅ 推荐: 统一 action 模式
{
  name: "zentao_bugs",
  inputSchema: {
    properties: {
      action: { enum: ["list", "view", "create", "resolve", "close"] },
      // ... 其他参数
    }
  }
}

// ❌ 避免: 每个操作一个工具
zentao_get_bugs, zentao_get_bug, zentao_create_bug, zentao_resolve_bug...
```

### API 调用

禅道有两种 API：

1. **REST API v1** (`/api.php/v1/...`)
   - 标准 RESTful 接口
   - 适用于: Bug、需求、用例、产品、项目等

2. **内置 API** (`/index.php?m=xxx&f=xxx`)
   - 传统接口
   - 适用于: 文档管理等特殊功能
   - 详见: `.cursor/skills/zentao-builtin-api.md`

### 文档工具 (zentao_docs)

文档工具使用内置 API，支持以下操作：

| action         | 说明                        | 必需参数                          |
| -------------- | --------------------------- | --------------------------------- |
| `tree`         | 获取文档空间树（目录+文档） | `spaceType`, `spaceID`            |
| `view`         | 获取文档详情                | `docID`                           |
| `create`       | 创建文档                    | `libID`, `title`                  |
| `edit`         | 编辑文档                    | `docID`                           |
| `createModule` | 创建目录                    | `libID`, `moduleName`, `spaceID`  |
| `editModule`   | 编辑目录                    | `moduleID`, `moduleName`, `libID` |

**使用示例：**

```typescript
// 获取产品 1 的文档空间树
zentao_docs({ action: "tree", spaceType: "product", spaceID: 1 });

// 在文档库 1 下创建目录
zentao_docs({ action: "createModule", libID: 1, moduleName: "新目录", spaceID: 1 });

// 在目录 111 下创建文档
zentao_docs({ action: "create", libID: 1, moduleID: 111, title: "新文档", content: "..." });
```

## 常见任务

### 添加新工具

1. 在 `packages/zentao-mcp/src/types.ts` 中定义相关类型
2. 在 `packages/zentao-mcp/src/zentao-clients/` 中实现 API 方法
3. 在 `packages/zentao-mcp/src/index.ts` 中注册工具并实现 handler

### 调试 API

```bash
# 运行测试脚本
npx tsx test-doc-api.ts

# 编译项目
yarn build

# 本地测试 MCP Server
node packages/zentao-mcp/dist/index.js
```

### 发布更新

```bash
npm version patch  # 或 minor/major
yarn build
cd packages/zentao-mcp && npm publish --access public
```

## 注意事项

### 模板保护

创建 Bug 时有重要的模板字段，**不要删除**：

```typescript
steps: {
  description: `重现步骤 (支持 HTML 格式，可内嵌图片)
  
建议按以下模板填写：
【前置条件】...
【操作步骤】1. ... 2. ...
【预期结果】...
【实际结果】...
【复现概率】...`;
}
```

### SSL 证书

自签名证书环境需要：

```typescript
import https from "https";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
```

### Session 管理

内置 API 需要同时在 URL 和 Cookie 中传递 `zentaosid`，详见 skills 文档。

## 相关文档

- `.cursor/skills/zentao-builtin-api.md` - 内置 API 调用指南
- `.cursor/rules/code-style.md` - 代码风格规范
- `README.md` - 用户使用文档

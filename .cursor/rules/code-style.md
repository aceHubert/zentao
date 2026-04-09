# 代码风格规范

## TypeScript 规范

### 类型定义

```typescript
// ✅ 使用 interface 定义对象类型
interface Bug {
  id: number;
  title: string;
  status: BugStatus;
}

// ✅ 使用 type 定义联合类型
type BugStatus = 'active' | 'resolved' | 'closed';

// ✅ 导出类型供外部使用
export interface CreateBugParams {
  product: number;
  title: string;
  // ...
}
```

### 函数注释

```typescript
/**
 * 获取产品的 Bug 列表
 * @param productID - 产品 ID
 * @param browseType - 浏览类型筛选
 * @param limit - 返回数量限制
 * @returns Bug 列表
 */
async getBugs(
  productID: number,
  browseType?: BugBrowseType,
  limit?: number
): Promise<Bug[]> {
  // ...
}
```

### 错误处理

```typescript
// ✅ 使用 try-catch 并提供有意义的错误信息
try {
  const response = await this.get(`/bugs/${bugID}`);
  return response.data;
} catch (error) {
  throw new Error(`获取 Bug #${bugID} 失败: ${error.message}`);
}
```

## MCP 工具定义规范

### 工具命名

```typescript
// ✅ 使用 zentao_ 前缀
name: "zentao_bugs"

// ✅ 资源名使用复数形式（当支持多个操作时）
name: "zentao_stories"

// ❌ 避免过长的名称
name: "zentao_get_product_bug_list"
```

### 工具描述

```typescript
// ✅ 清晰说明功能和支持的操作
description: "Bug 管理工具。支持操作: list(列表), view(详情), create(创建), resolve(解决), close(关闭)"

// ❌ 描述过于简单
description: "Bug 工具"
```

### 参数定义

```typescript
inputSchema: {
  type: "object",
  properties: {
    // ✅ 使用 enum 限制可选值
    action: {
      type: "string",
      enum: ["list", "view", "create"],
      description: "操作类型"
    },
    // ✅ 提供默认值说明
    limit: {
      type: "number",
      description: "返回数量限制，默认 20"
    },
    // ✅ 复杂字段提供模板
    steps: {
      type: "string",
      description: `重现步骤。建议格式：
【前置条件】...
【操作步骤】...
【预期结果】...`
    }
  },
  // ✅ 明确必填字段
  required: ["action"]
}
```

## Axios 请求规范

### GET 请求

```typescript
// ✅ 使用 params 传递查询参数
const response = await this.client.get('/bugs', {
  params: { product: productID, limit }
});
```

### POST 请求

```typescript
// ✅ REST API 使用 JSON
const response = await this.client.post('/bugs', bugData);

// ✅ 内置 API 使用 FormData
const form = new FormData();
form.append('title', title);
await this.client.post(url, form, {
  headers: { ...form.getHeaders(), 'X-Requested-With': 'XMLHttpRequest' }
});
```

### 错误处理

```typescript
// ✅ 拦截器统一处理
this.client.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error || error.message;
    throw new Error(message);
  }
);
```

## 文件组织

### 导入顺序

```typescript
// 1. Node.js 内置模块
import https from 'https';

// 2. 第三方模块
import axios from 'axios';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// 3. 本地模块
import { ZentaoClient } from './zentao-client.js';
import type { Bug, Story } from './types.js';
```

### 导出规范

```typescript
// ✅ 明确导出需要的内容
export { ZentaoClient };
export type { Bug, Story, CreateBugParams };

// ❌ 避免 export *
export * from './types';
```

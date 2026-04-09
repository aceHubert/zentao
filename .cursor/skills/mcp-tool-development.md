# MCP 工具开发指南

## MCP 基础概念

MCP (Model Context Protocol) 是一个标准化协议，让 AI 助手能够与外部系统交互。

### 核心组件

1. **Server**: 提供工具和资源的服务端
2. **Tools**: 可调用的功能
3. **Resources**: 可读取的数据源

## 工具定义

### 基本结构

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "tool_name",
      description: "工具描述",
      inputSchema: {
        type: "object",
        properties: {
          // 参数定义
        },
        required: ["必填参数"]
      }
    }
  ]
}));
```

### 参数类型

```typescript
// 字符串
param: { type: "string", description: "描述" }

// 数字
param: { type: "number", description: "描述" }

// 布尔
param: { type: "boolean", description: "描述" }

// 枚举
param: { 
  type: "string", 
  enum: ["option1", "option2"], 
  description: "描述" 
}

// 数组
param: { 
  type: "array",
  items: { type: "string" },
  description: "描述"
}

// 对象
param: {
  type: "object",
  properties: {
    nested: { type: "string" }
  }
}
```

## 工具实现

### Handler 结构

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "tool_name": {
      const result = await doSomething(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### 返回格式

```typescript
// 文本返回
return {
  content: [{ type: "text", text: "结果文本" }]
};

// JSON 返回
return {
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
};

// 错误返回
return {
  content: [{ type: "text", text: `错误: ${error.message}` }],
  isError: true
};
```

## 统一 Action 模式

### 设计原则

将相关操作合并到单个工具，通过 `action` 参数区分：

```typescript
{
  name: "zentao_bugs",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list", "view", "create", "resolve", "close"],
        description: "操作类型"
      },
      productID: { type: "number", description: "产品 ID (list/create 必填)" },
      bugID: { type: "number", description: "Bug ID (view/resolve/close 必填)" },
      // 创建时的参数
      title: { type: "string" },
      // ...
    },
    required: ["action"]
  }
}
```

### Handler 实现

```typescript
case "zentao_bugs": {
  const { action, productID, bugID, ...params } = args;
  
  switch (action) {
    case "list":
      return formatResult(await client.getBugs(productID, params.browseType));
    case "view":
      return formatResult(await client.getBug(bugID));
    case "create":
      return formatResult(await client.createBug({ product: productID, ...params }));
    case "resolve":
      return formatResult(await client.resolveBug(bugID, params.resolution));
    case "close":
      return formatResult(await client.closeBug(bugID, params.comment));
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
```

## 最佳实践

### 1. 描述要清晰

```typescript
// ✅ 好的描述
description: "Bug 管理。action: list(按产品列出), view(查看详情), create(创建), resolve(解决), close(关闭)"

// ❌ 差的描述
description: "Bug 工具"
```

### 2. 参数说明要完整

```typescript
// ✅ 包含类型、默认值、格式说明
limit: {
  type: "number",
  description: "返回数量限制，默认 20，最大 100"
}

// ✅ 复杂参数提供模板
steps: {
  type: "string",
  description: `重现步骤，建议格式：
【前置条件】环境信息
【操作步骤】1. xxx 2. xxx
【预期结果】xxx
【实际结果】xxx`
}
```

### 3. 错误处理要友好

```typescript
try {
  const result = await client.createBug(params);
  return { content: [{ type: "text", text: `创建成功，Bug ID: ${result.id}` }] };
} catch (error) {
  return {
    content: [{ type: "text", text: `创建失败: ${error.message}` }],
    isError: true
  };
}
```

### 4. 保护重要模板

创建类操作的模板字段不要随意修改：

```typescript
// ⚠️ 保护的模板 - 不要删除
spec: {
  description: `需求描述（必填）。建议按以下禅道模板格式填写：

【目标】要达到的结果
【范围】包含/不包含
【约束】限制条件
【验收标准】可检查的标准
【风险点】可能翻车的地方`
}
```

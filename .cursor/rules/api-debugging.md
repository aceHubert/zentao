# API 调试规范

## 调试流程

### 1. 创建测试脚本

在项目根目录创建临时测试脚本：

```typescript
// test-xxx-api.ts
import axios from 'axios';

const ZENTAO_URL = 'http://your-zentao-server';
const ZENTAO_ACCOUNT = 'your_account';
const ZENTAO_PASSWORD = 'your_password';

async function main() {
  // 测试代码
}

main().catch(console.error);
```

运行：`npx tsx test-xxx-api.ts`

### 2. 导出响应到文件

```typescript
import fs from 'fs';

const resp = await http.post(url, data, config);

// 完整响应
fs.writeFileSync('response.json', JSON.stringify({
  status: resp.status,
  headers: resp.headers,
  data: resp.data,
}, null, 2));

// HTML 响应单独保存
if (typeof resp.data === 'string' && resp.data.includes('<html')) {
  fs.writeFileSync('response.html', resp.data);
}
```

### 3. 对比浏览器请求

1. 在浏览器中完成操作
2. 打开 DevTools → Network
3. 找到对应请求
4. 右键 → Copy → Copy as fetch
5. 对比参数差异：
   - URL 参数
   - Headers
   - Body 格式
   - Cookies

## 常见问题排查

### 返回 HTML 而非 JSON

**检查清单：**
- [ ] 是否添加了 `X-Requested-With: XMLHttpRequest`
- [ ] 是否添加了 `Referer` 头
- [ ] Session ID 是否在 URL 和 Cookie 中都传递了
- [ ] Content-Type 是否正确

### 401/403 权限错误

**检查清单：**
- [ ] 登录是否成功
- [ ] Cookie 是否正确传递
- [ ] 账号是否有足够权限

### SSL 证书错误

```typescript
import https from 'https';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
```

## 日志输出规范

```typescript
console.log('========================================');
console.log('测试名称');
console.log('========================================');

console.log('\n1. 步骤一...');
console.log('  URL:', url);
console.log('  参数:', params);

// 成功
console.log('  ✓ 操作成功');

// 失败
console.log('  ✗ 操作失败:', error.message);

console.log('\n========================================');
```

## 测试文件清理

测试完成后删除临时文件：
- `test-*.ts`
- `response.json`
- `response.html`

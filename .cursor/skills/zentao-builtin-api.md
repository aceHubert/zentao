# 禅道内置 API 调用指南

## 概述

禅道有两种 API 调用方式：
1. **REST API v1** (`/api.php/v1/...`) - 标准 RESTful 接口，适用于大部分资源
2. **内置 API** (`/index.php?m=xxx&f=xxx`) - 传统接口，某些功能（如文档管理）只能通过内置 API 访问

本文档记录内置 API 的调用经验和常见问题解决方案。

---

## 认证流程

### 1. 获取 Session

```
GET /index.php?m=api&f=getSessionID&t=json
或
GET /api-getsessionid.json
```

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "sessionName": "zentaosid",
    "sessionID": "a7sd6f8g7s8df68gs7df6g",
    "rand": 4273
  }
}
```

### 2. 用户登录

```
POST /index.php?m=user&f=login&t=json&zentaosid={sessionID}
Content-Type: application/x-www-form-urlencoded

account={username}&password={encryptedPassword}&verifyRand={rand}
```

**⚠️ 密码加密方式：**
```javascript
const passwordMd5 = CryptoJS.MD5(password).toString();
const encryptedPassword = CryptoJS.MD5(passwordMd5 + rand).toString();
```

### 3. 后续请求

所有后续请求必须：
- **URL 参数**：添加 `zentaosid={sessionID}`
- **Cookie**：携带登录后获得的 cookies

---

## 关键问题与解决方案

### 问题 1：API 返回 HTML 而不是 JSON

**现象：** POST 请求返回完整的 HTML 页面，而不是预期的 JSON 响应。

**原因：** 服务器未将请求识别为 AJAX 请求。

**解决方案：** 添加必要的请求头：

```javascript
{
  'X-Requested-With': 'XMLHttpRequest',  // 必需！标识为 AJAX 请求
  'Accept': '*/*',
  'Referer': `${baseUrl}/index.php?m=doc&f=productspace&objectID=1...`  // 必需！
}
```

### 问题 2：Session 无效或过期

**现象：** 登录成功后，后续请求返回登录页面。

**解决方案：**
1. 确保在 **URL 参数** 中传递 `zentaosid`：
   ```
   /index.php?m=doc&f=create&...&zentaosid={sessionID}
   ```
2. 确保 **Cookie** 正确传递，使用 axios 拦截器管理 cookies：
   ```javascript
   let cookies: string[] = [];
   
   http.interceptors.response.use((response) => {
     const setCookies = response.headers['set-cookie'];
     if (setCookies) {
       setCookies.forEach((c: string) => {
         const name = c.split('=')[0];
         const value = c.split(';')[0];
         const idx = cookies.findIndex((x) => x.startsWith(name + '='));
         if (idx >= 0) cookies[idx] = value;
         else cookies.push(value);
       });
     }
     return response;
   });
   
   http.interceptors.request.use((config) => {
     if (cookies.length > 0) config.headers['Cookie'] = cookies.join('; ');
     return config;
   });
   ```

### 问题 3：HTTPS 证书验证失败

**现象：** `unable to verify the first certificate`

**解决方案：** 跳过 SSL 证书验证（仅开发环境）：

```javascript
import https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const http = axios.create({ baseURL: url, httpsAgent });
```

### 问题 4：multipart/form-data 请求

**现象：** 文档创建需要 `multipart/form-data` 格式。

**解决方案：** 使用 `form-data` 库：

```javascript
import FormData from 'form-data';

const form = new FormData();
form.append('title', '文档标题');
form.append('content', '文档内容');
form.append('lib', '1');
form.append('module', '0');
form.append('status', 'draft');
form.append('type', 'text');
form.append('acl', 'open');
// ... 其他字段

await http.post(url, form, {
  headers: { 
    ...form.getHeaders(),
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': refererUrl
  }
});
```

---

## 文档 API 示例

### 创建文档

```
POST /index.php?m=doc&f=create&objectType=product&objectID=1&libID=1&moduleID=0&zentaosid={sessionID}
Content-Type: multipart/form-data

字段：
- title: 文档标题
- content: 文档内容
- lib: 文档库 ID
- module: 模块 ID
- status: draft | normal
- type: text
- acl: open | private
- space: product | project | ...
- product: 产品 ID
```

**成功响应：**
```json
{
  "result": "success",
  "message": "保存成功",
  "load": "/index.php?m=doc&f=view&docID=5",
  "id": 5,
  "doc": {
    "status": "new",
    "id": 5,
    "files": [],
    "docType": "text",
    "libID": 1
  }
}
```

### 编辑文档

```
POST /index.php?m=doc&f=edit&docID=3&zentaosid={sessionID}
Content-Type: multipart/form-data
```

### 获取文档详情

```
GET /index.php?m=doc&f=ajaxGetDoc&docID=3&version=1&zentaosid={sessionID}
X-Requested-With: XMLHttpRequest
```

---

## 文档目录 API 示例

### 获取文档空间数据（目录树）

```
GET /index.php?m=doc&f=ajaxGetSpaceData&type=product&spaceID=1&picks=&zentaosid={sessionID}
X-Requested-With: XMLHttpRequest
```

**响应结构：**
```json
{
  "spaceID": 1,
  "spaces": [{ "id": 1, "name": "产品名称", "type": "product" }],
  "libs": [{ "id": 1, "name": "产品主库", "type": "product" }],
  "modules": [{ "id": 111, "root": 1, "name": "目录名称", "parent": 0 }],
  "docs": [{ "id": 2, "lib": 1, "module": 0, "title": "文档标题" }]
}
```

### 创建文档目录

```
POST /index.php?m=tree&f=ajaxCreateModule&zentaosid={sessionID}
Content-Type: multipart/form-data

字段：
- name: 目录名称
- libID: 文档库 ID
- parentID: 父目录 ID（0 为根目录）
- objectID: 产品/项目 ID
- moduleType: doc
- isUpdate: false
- createType: child
```

**成功响应：**
```json
{
  "result": "success",
  "message": "保存成功",
  "module": {
    "id": 112,
    "root": 1,
    "name": "新目录",
    "parent": 0
  }
}
```

### 编辑文档目录

```
POST /index.php?m=doc&f=editCatalog&moduleID=111&type=doc&zentaosid={sessionID}
Content-Type: multipart/form-data
X-ZUI-Modal: true

字段：
- root: 文档库 ID
- parent: 父目录 ID
- name: 新目录名称
```

---

## 调试技巧

### 1. 导出完整响应

```javascript
const resp = await http.post(url, data, config);

fs.writeFileSync('response.json', JSON.stringify({
  status: resp.status,
  headers: resp.headers,
  data: resp.data,
}, null, 2));

// 如果是 HTML，单独保存便于查看
if (typeof resp.data === 'string') {
  fs.writeFileSync('response.html', resp.data);
}
```

### 2. 打印 Cookies

```javascript
console.log('Cookies:', cookies.join('; '));
```

### 3. 使用浏览器 DevTools

1. 在浏览器中完成操作
2. 打开 Network 面板
3. 找到对应请求
4. 右键 → Copy → Copy as fetch
5. 对比请求参数差异

---

## 常见字段说明

| 字段 | 说明 |
|-----|------|
| `zentaosid` | Session ID，必须在 URL 和 Cookie 中传递 |
| `rand` | 随机数，用于密码加密 |
| `objectType` | 对象类型：product, project, execution, custom, mine |
| `objectID` | 对象 ID |
| `libID` | 文档库 ID |
| `moduleID` | 模块 ID |
| `acl` | 访问控制：open (公开), private (私有) |

---

## 总结

调用禅道内置 API 的关键点：

1. ✅ 正确加密密码：`md5(md5(password) + rand)`
2. ✅ URL 参数带 `zentaosid`
3. ✅ Cookie 正确传递
4. ✅ 添加 `X-Requested-With: XMLHttpRequest` 头
5. ✅ 添加 `Referer` 头
6. ✅ 使用 `multipart/form-data` 格式（文档类接口）

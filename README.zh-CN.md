# Onion Fetch

Onion Fetch 是一个轻量级的、基于中间件的 fetch 库，适用于浏览器和 Node.js 环境，其设计灵感来源于 Koa.js。它提供了一种灵活且可扩展的方式来发出 HTTP 请求。

## 特性

- 基于中间件的架构
- TypeScript 支持
- 易于使用的 API
- 同时适用于浏览器和 Node.js 环境

## 安装

```bash
npm install onion-fetch
# 或者
yarn add onion-fetch
# 或者
pnpm add onion-fetch
```

## 使用方法

```typescript
import { createRequest } from 'onion-fetch';

// 创建一个带有基础 URL 的请求实例
const $fetch = createRequest({
  baseURL: 'https://api.example.com'
});

// 执行 GET 请求
async function fetchData() {
  try {
    const data = await $fetch('/data');
    console.log(data);
  } catch (error) {
    console.error('获取数据时出错:', error);
  }
}

fetchData();

// 执行 POST 请求
async function postData() {
  try {
    const data = await $fetch('/submit', {
      method: 'POST',
      body: { name: 'John Doe', age: 30 }
    });
    console.log(data);
  } catch (error) {
    console.error('提交数据时出错:', error);
  }
}

postData();
```

## API

### `createRequest(globalOptions?: CreateFetchOptions)`

创建一个新的请求实例。

- `globalOptions` (可选): 请求实例的全局选项。
  - `baseURL`: 此实例发出的所有请求的基础 URL。
  - `middlewares`: 应用于所有请求的全局中间件数组。
  - `...otherFetchOptions`: 其他任何要全局应用的标准 `fetch` 选项。

返回一个通用的请求函数 `$fetch`，具有以下特性：

- `$fetch<T = any>(request: string | URL, options?: FetchOptions): Promise<T>`: 发出请求并返回响应数据。
  - `T`: 响应数据的类型（默认为 any）
  - `options.responseType`: 响应数据的格式（'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream'）
  - `options.middlewares`: 特定于此请求的中间件数组

- `$fetch.raw`: 返回完整的响应对象，包含状态码、头部信息等。

### `RequestOptions`

扩展了标准 `fetch` 选项并包含：

- `middlewares`: 特定于请求的中间件数组。

### `Context`

请求上下文对象，包含以下属性：

- `request`: 请求 URL 或配置
- `options`: 请求选项，包含以下属性：
  - `baseURL`: 基础 URL
  - `headers`: 请求头
  - `...`
- `response`: 响应对象（由中间件填充）
- `error`: 错误对象（如果请求失败）

### `Middleware`

签名为 `(ctx: Context, next: NextFunction) => Promise<void> | void` 的函数。

- `ctx`: 请求上下文对象，包含 `request` 和 `response` 属性
- `next`: 调用链中下一个中间件的函数

## 中间件

中间件是可以处理请求和响应的函数，采用洋葱模型架构。每个中间件都可以在请求发送前和响应返回后执行逻辑，提供了强大的请求处理能力。

### 洋葱模型执行顺序

中间件按照添加顺序执行，遵循"由外向内"的请求处理和"由内向外"的响应处理模式：

1. 请求阶段：从第一个中间件开始，依次向内执行 `next()` 之前的代码
2. 响应阶段：从最后一个中间件开始，依次向外执行 `next()` 之后的代码

```typescript
import { createRequest, Middleware, Context, NextFunction } from 'onion-fetch';

// 记录请求耗时的中间件
const timingMiddleware: Middleware = async (ctx: Context, next: NextFunction) => {
  const start = Date.now();
  console.log('⭐ 开始请求');
  
  await next(); // 等待内层中间件和请求完成
  
  const ms = Date.now() - start;
  console.log(`🏁 请求完成，耗时 ${ms}ms`);
};

// 添加认证令牌的中间件
const authMiddleware: Middleware = async (ctx: Context, next: NextFunction) => {
  console.log('📝 添加认证信息');
  ctx.request.options.headers = {
    ...ctx.request.options.headers,
    'Authorization': 'Bearer YOUR_TOKEN',
  };
  
  await next();
  
  console.log('✅ 认证请求完成');
};

// 创建请求实例，中间件将按照数组顺序执行
const $fetch = createRequest({
  baseURL: 'https://api.example.com',
  middlewares: [timingMiddleware, authMiddleware],
});

// 发起请求，控制台将按顺序输出：
// ⭐ 开始请求
// 📝 添加认证信息
// ✅ 认证请求完成
// 🏁 请求完成，耗时 XXXms
await $fetch('/protected-data');
```

## 贡献

欢迎贡献！请提交 issue 或 pull request。

## 许可证

MIT
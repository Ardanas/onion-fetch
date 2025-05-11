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
const request = createRequest('https://api.example.com');

// 执行 GET 请求
async function fetchData() {
  try {
    const response = await request.get('/data');
    console.log(response);
  } catch (error) {
    console.error('获取数据时出错:', error);
  }
}

fetchData();

// 执行 POST 请求
async function postData() {
  try {
    const response = await request.post('/submit', { name: 'John Doe', age: 30 });
    console.log(response);
  } catch (error) {
    console.error('提交数据时出错:', error);
  }
}

postData();
```

## API

### `createRequest(baseUrl?: string, globalOptions?: GlobalOptions)`

创建一个新的请求实例。

- `baseUrl` (可选): 此实例发出的所有请求的基础 URL。
- `globalOptions` (可选): 请求实例的全局选项。
  - `middlewares`: 应用于所有请求的全局中间件数组。
  - `...otherFetchOptions`: 其他任何要全局应用的标准 `fetch` 选项。

返回一个包含以下方法的对象：

- `request(url: string, options?: RequestOptions): Promise<any>`: 发出通用请求。
- `get(url: string, options?: RequestOptions): Promise<any>`: 发出 GET 请求。
- `post(url: string, data?: BodyInit | null, options?: RequestOptions): Promise<any>`: 发出 POST 请求。

### `RequestOptions`

扩展了标准 `fetch` 选项并包含：

- `middlewares`: 特定于请求的中间件数组。

### `Context`

请求上下文对象，包含以下属性：

- `request`: 请求相关信息
  - `baseUrl`: 基础 URL
  - `url`: 请求 URL
  - `options`: 请求选项
- `response`: 响应数据（由中间件填充）

### `Middleware`

签名为 `(ctx: Context, next: NextFunction) => Promise<void> | void` 的函数。

- `ctx`: 请求上下文对象，包含 `request` 和 `response` 属性
- `next`: 调用链中下一个中间件的函数

## 中间件

中间件是可以处理请求和响应的函数。它们按照添加的顺序执行。

```typescript
import { createRequest, Middleware, Context, NextFunction } from 'onion-fetch';

// 自定义中间件以添加认证令牌
const authMiddleware: Middleware = async (ctx: Context, next: NextFunction) => {
  ctx.request.options.headers = {
    ...ctx.request.options.headers,
    'Authorization': 'Bearer YOUR_TOKEN',
  };
  await next();
};

const request = createRequest('https://api.example.com', {
  middlewares: [authMiddleware],
});

// 使用此实例发出的所有请求都将包含 Authorization 标头
request.get('/protected-data');
```

## 贡献

欢迎贡献！请提交 issue 或 pull request。

## 许可证

MIT
import { createRequest } from '../dist/index.mjs';

const BASE_URL = '';

async function loggerMiddleware(ctx, next) {
  console.log('loggerMiddleware before');
  await next();
  console.log('loggerMiddleware after');
}

async function authMiddleware(ctx, next) {
  console.log('authMiddleware before');
  const token = localStorage.getItem('token');
  if (token) {
    ctx.options.headers = {
      ...ctx.options.headers,
      Authorization: token,
    };
  }
  await next();
  console.log('authMiddleware after');
}

async function requestHeaderMiddleware(ctx, next) {
  console.log('requestHeaderMiddleware before');
  const requestChannelCode = 'PM';
  ctx.options.headers = {
    ...ctx.options.headers,
    requestChannelCode,
    requestGlobalJnlNo: '',
    'Content-Type': 'application/json',
  };
  await next();
  console.log('requestHeaderMiddleware after');
}

async function responseMiddleware(ctx, next) {
  console.log('responseMiddleware before');
  await next();
  console.log('responseMiddleware after');
  if (!ctx.response) {
    throw new Error("No response received");
  }
  const status = ctx.response.status;

  if (status !== 200) {
    if (status === 401) {
      // 处理未登录状态，可以根据需要自定义逻辑
      if (typeof window !== "undefined") {
        alert("未登录或登录已过期，请重新登录。");
      }
      return;
    }
    throw new Error(`HTTP error! status: ${status}`);
  }
}

const $fetch = createRequest({
  baseURL: BASE_URL,
  middlewares: [requestHeaderMiddleware, loggerMiddleware, authMiddleware, responseMiddleware],
});


$fetch('https://jsonplaceholder.typicode.com/users').then((res) => {
  console.log('res', res);
})

import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  createApp,
  createError,
  eventHandler,
  readBody,
  readRawBody,
  toNodeListener,
} from "h3";
import { createRequest } from '../src';


describe('onion-fetch', () => {
  const fetch = vi.spyOn(globalThis, "fetch");

  beforeAll(async () => {
    const app = createApp()
      .use(
        "/ok",
        eventHandler(() => "ok")
      )
      // .use(
      //   "/params",
      //   eventHandler((event) => getQuery(event.node.req.url || ""))
      // )
      .use(
        "/url",
        eventHandler((event) => event.node.req.url)
      )
      .use(
        "/echo",
        eventHandler(async (event) => ({
          path: event.path,
          body:
            event.node.req.method === "POST"
              ? await readRawBody(event)
              : undefined,
          headers: event.node.req.headers,
        }))
      )
      .use(
        "/post",
        eventHandler(async (event) => ({
          body: await readBody(event),
          headers: event.node.req.headers,
        }))
      )
      .use(
        "/binary",
        eventHandler((event) => {
          event.node.res.setHeader("Content-Type", "application/octet-stream");
          return new Blob(["binary"]);
        })
      )
      .use(
        "/403",
        eventHandler(() =>
          createError({ status: 403, statusMessage: "Forbidden" })
        )
      )
      .use(
        "/408",
        eventHandler(() => createError({ status: 408 }))
      )
      .use(
        "/204",
        eventHandler(() => null) // eslint-disable-line unicorn/no-null
      )
      .use(
        "/timeout",
        eventHandler(async () => {
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(createError({ status: 408 }));
            }, 1000 * 5);
          });
        })
      );
  });
})

// describe('baseURL Tests', () => {
//   const $fetch = createRequest({
//     baseURL: 'https://api.example.com'
//   });

//   it("baseURL", async () => {
//     const response = await $fetch('/test');
//     // expect().to.equal(
//     //   "/x?foo=123"
//     // );
//   });
// })


// describe('Core Functionality Tests', () => {


//   beforeEach(() => {
//     mockFetch.mockReset();
//   });

//   it('should handle base URL and path combination correctly', async () => {
//     const mockData = { message: 'success' };
//     mockFetch.mockResolvedValue(createMockResponse(mockData, true, 200));

//     const $fetch = createRequest({
//       baseURL: 'https://api.example.com'
//     });

//     // 测试基本路径组合
//     const response = await $fetch('/test');
//     expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
//       method: 'GET'
//     });
//     expect(response).toEqual(mockData);

//     // 测试末尾斜杠的处理
//     await $fetch({ url: 'test2/' });
//     expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test2/', {
//       method: 'GET'
//     });

//     // 测试查询参数的处理
//     await $fetch({ url: '/test3?param=value&other=123' });
//     expect(mockFetch).toHaveBeenCalledWith(
//       'https://api.example.com/test3?param=value&other=123',
//       { method: 'GET' }
//     );
//   });

//   it('should handle various baseURL combinations', async () => {
//     const mockData = { message: 'success' };
//     mockFetch.mockResolvedValue(createMockResponse(mockData, true, 200));

//     // 测试没有baseURL的情况
//     const fetchNoBase = createRequest();
//     await fetchNoBase({ url: 'https://api.example.com/test' });
//     expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
//       method: 'GET'
//     });

//     // 测试baseURL带斜杠，路径不带斜杠
//     const fetchWithSlash = createRequest('https://api.example.com/');
//     await fetchWithSlash({ url: 'test' });
//     expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
//       method: 'GET'
//     });

//     // 测试baseURL不带斜杠，路径带斜杠
//     const fetchNoSlash = createRequest('https://api.example.com');
//     await fetchNoSlash({ url: '/test' });
//     expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
//       method: 'GET'
//     });

//     // 测试完整URL会覆盖baseURL
//     const fetchFull = createRequest('https://api.example.com');
//     await fetchFull({ url: 'https://other.api.com/test' });
//     expect(mockFetch).toHaveBeenCalledWith('https://other.api.com/test', {
//       method: 'GET'
//     });
//   });

//   it('should handle request body and headers correctly', async () => {
//     const mockData = { message: 'posted' };
//     const postPayload = { data: 'some data' };
//     mockFetch.mockResolvedValue(createMockResponse(mockData, true, 200));

//     const $fetch = createRequest('https://api.example.com');
//     const response = await $fetch({
//       url: '/submit',
//       method: 'POST',
//       body: postPayload,
//       headers: { 'Content-Type': 'application/json' }
//     });

//     expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/submit', {
//       method: 'POST',
//       body: JSON.stringify(postPayload),
//       headers: { 'Content-Type': 'application/json' }
//     });
//     expect(response).toEqual(mockData);
//   });

//   it('should verify middleware execution order and context modification', async () => {
//     const executionOrder: string[] = [];
//     const mockMiddleware = vi.fn(async (ctx, next) => {
//       executionOrder.push('before global middleware');
//       ctx.request.options.headers = { 'X-Global-Middleware': 'applied' };
//       await next();
//       executionOrder.push('after global middleware');
//       // 验证中间件可以修改响应
//       if (ctx.response) {
//         ctx.response._data.modified = true;
//       }
//     });

//     (fetch as vi.Mock).mockResolvedValue(createMockResponse({}, true, 200));

//     const $fetch = createRequest('https://api.example.com', { middlewares: [mockMiddleware] });
//     await $fetch({ url: '/test-middleware' });

//     expect(mockMiddleware).toHaveBeenCalled();
//     expect(fetch).toHaveBeenCalledWith('https://api.example.com/test-middleware', {
//       method: 'GET',
//       headers: { 'X-Global-Middleware': 'applied' },
//     });
//   });

//   it('should apply request-specific middlewares after global ones', async () => {
//     const globalMiddleware = vi.fn((ctx, next) => {
//       ctx.request.options.headers = { 'X-Global': 'yes' };
//       return next();
//     });
//     const requestMiddleware = vi.fn((ctx, next) => {
//       ctx.request.options.headers = { ...ctx.request.options.headers, 'X-Request': 'yes' };
//       return next();
//     });

//     (fetch as vi.Mock).mockResolvedValue(createMockResponse({}, true, 200));

//     const $fetch = createRequest('https://api.example.com', { middlewares: [globalMiddleware] });
//     await $fetch({
//       url: '/test-both-middlewares',
//       middlewares: [requestMiddleware]
//     });

//     expect(globalMiddleware).toHaveBeenCalled();
//     expect(requestMiddleware).toHaveBeenCalled();
//     expect(fetch).toHaveBeenCalledWith('https://api.example.com/test-both-middlewares', {
//       method: 'GET',
//       headers: { 'X-Global': 'yes', 'X-Request': 'yes' },
//     });
//   });

//   it('should handle fetch errors from fetchMiddleware when response is not ok', async () => {
//     // Mock a non-JSON error response
//     const mockFetch = fetch as vi.Mock;
//     mockFetch.mockResolvedValue({
//       ok: false,
//       status: 500,
//       headers: new Headers({ 'Content-Type': 'text/plain' }),
//       json: vi.fn(() => Promise.reject(new Error('Should not be called'))),
//       text: () => Promise.resolve('Server Error') // Or some other non-JSON body
//     });
//     console.error = vi.fn(); // Mock console.error to ensure no unexpected errors are logged by other parts

//     const $fetch = createRequest('https://api.example.com');

//     try {
//       await $fetch({ url: '/error' });
//     } catch (e: any) {
//       expect(e.message).toBe('HTTP error! status: 500');
//       // Ensure response.json() was not called for non-JSON error
//       const mockCall = mockFetch.mock.results[mockFetch.mock.results.length - 1].value;
//       expect(mockCall.json).not.toHaveBeenCalled();
//     }
//   });

//   it('should handle fetch errors from fetchMiddleware when response is not ok and IS JSON', async () => {
//     // Mock a JSON error response
//     const errorData = { code: 'INTERNAL_ERROR', message: 'Something went wrong' };
//     const mockFetch = fetch as vi.Mock;
//     mockFetch.mockResolvedValue({
//       ok: false,
//       status: 500,
//       headers: new Headers({ 'Content-Type': 'application/json' }),
//       json: vi.fn(() => Promise.resolve(errorData)),
//     });
//     console.error = vi.fn();

//     const $fetch = createRequest('https://api.example.com');

//     try {
//       await $fetch({ url: '/json-error' });
//     } catch (e: any) {
//       expect(e.message).toBe('HTTP error! status: 500');
//       const mockCall = mockFetch.mock.results[mockFetch.mock.results.length - 1].value;
//       expect(mockCall.json).toHaveBeenCalled();
//     }
//     // Check that fetch was called
//     expect(fetch).toHaveBeenCalledWith('https://api.example.com/json-error', { method: 'GET' });
//   });
// });
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp, createError, eventHandler, getRouterParams, readBody, readRawBody, toNodeListener } from 'h3';
import { listen } from 'listhen';
import { createRequest } from '../src';
import path from 'path';

describe('onion-fetch', () => {
  let listener;

  const getURL = (url: string) => path.join(listener.url, url);

  const fetch = vi.spyOn(globalThis, 'fetch');
  const $fetch = createRequest();

  beforeAll(async () => {
    const app = createApp()
      .use(
        '/ok',
        eventHandler(() => 'ok')
      )
      .use(
        '/params',
        eventHandler((event) => {
          const url = new URL(event.node.req.url || '', 'http://localhost');
          const params = Object.fromEntries(url.searchParams.entries());
          return params;
        })
      )
      .use(
        '/base/foo',
        eventHandler(() => 'foo')
      )
      .use(
        '/url',
        eventHandler((event) => event.node.req.url)
      )
      .use(
        '/echo',
        eventHandler(async (event) => ({
          path: event.path,
          body: event.node.req.method === 'POST' ? await readRawBody(event) : undefined,
          headers: event.node.req.headers,
        }))
      )
      .use(
        '/post',
        eventHandler(async (event) => ({
          body: await readBody(event),
          headers: event.node.req.headers,
        }))
      )
      .use(
        '/binary',
        eventHandler((event) => {
          event.node.res.setHeader('Content-Type', 'application/octet-stream');
          return new Blob(['binary']);
        })
      )
      .use(
        '/403',
        eventHandler(() => createError({ status: 403, statusMessage: 'Forbidden' }))
      )
      .use(
        '/408',
        eventHandler(() => createError({ status: 408 }))
      )
      .use(
        '/204',
        eventHandler(() => null) // eslint-disable-line unicorn/no-null
      )
      .use(
        '/timeout',
        eventHandler(async () => {
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(createError({ status: 408 }));
            }, 1000 * 5);
          });
        })
      );

    listener = await listen(toNodeListener(app));
  });

  afterAll(() => {
    listener.close().catch(console.error);
  });

  beforeEach(() => {
    fetch.mockClear();
  });

  it('ok', async () => {
    expect(await $fetch(getURL('ok'))).to.equal('ok');
  });

  it('baseURL', async () => {
    const $fetch = createRequest({
      baseURL: getURL('base')
    });
    const res = await $fetch('/foo');
    expect(res).to.equal('foo');
  });

  it('middleware', async () => {
    const executionOrder: string[] = [];
    const globalMiddleware = vi.fn(async (ctx, next) => {
      executionOrder.push('before global middleware');
      ctx.options.headers = { 'X-Global': 'yes' };
      await next();
      executionOrder.push('after global middleware');
      // 验证中间件可以修改响应
      if (ctx.response) {
        ctx.response._data.modified = true;
      }
    });

    const requestMiddleware = vi.fn(async (ctx, next) => {
      executionOrder.push('before request middleware');
      ctx.options.headers = { ...ctx.options.headers, 'X-Request': 'yes' };
      await next();
      executionOrder.push('after request middleware');
    });

    const $fetch = createRequest({ middlewares: [globalMiddleware] });
    const response = await $fetch(getURL('echo'), {
      middlewares: [requestMiddleware]
    });

    // 验证中间件执行顺序
    expect(executionOrder).to.deep.equal([
      'before global middleware',
      'before request middleware',
      'after request middleware',
      'after global middleware'
    ]);

    // 验证请求头被正确修改
    expect(response?.headers).to.include({
      'x-global': 'yes',
      'x-request': 'yes'
    });

    // 验证响应被中间件修改
    expect(response?.modified).to.be.true;
  });

  it('allows specifying FetchResponse method', async () => {
    expect(await $fetch(getURL('params?test=true'), { responseType: 'json' })).to.deep.equal({ test: 'true' });
    expect(await $fetch(getURL('params?test=true'), { responseType: 'blob' })).to.be.instanceOf(Blob);
    expect(await $fetch(getURL('params?test=true'), { responseType: 'text' })).to.equal('{"test":"true"}');
    expect(await $fetch(getURL('params?test=true'), { responseType: 'arrayBuffer' })).to.be.instanceOf(ArrayBuffer);
  });

  it('stringifies posts body automatically', async () => {
    const { body } = await $fetch(getURL('post'), {
      method: 'POST',
      body: { num: 42 },
    });
    expect(body).to.deep.eq({ num: 42 });

    const body2 = (
      await $fetch(getURL('post'), {
        method: 'POST',
        body: [{ num: 42 }, { num: 43 }],
      })
    ).body;
    expect(body2).to.deep.eq([{ num: 42 }, { num: 43 }]);

    const headerFetches = [[['X-header', '1']], { 'x-header': '1' }, new Headers({ 'x-header': '1' })];

    for (const sentHeaders of headerFetches) {
      const { headers } = await $fetch(getURL('post'), {
        method: 'POST',
        body: { num: 42 },
        headers: sentHeaders as HeadersInit,
      });
      expect(headers).to.include({ 'x-header': '1' });
      expect(headers).to.include({ accept: 'application/json' });
    }
  });

  it('does not stringify body when content type != application/json', async () => {
    const message = '"Hallo von Pascal"';
    const { body } = await $fetch(getURL('echo'), {
      method: 'POST',
      body: message,
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(body).to.deep.eq(message);
  });

  it('Bypass FormData body', async () => {
    const data = new FormData();
    data.append('foo', 'bar');
    const { body } = await $fetch(getURL('post'), {
      method: 'POST',
      body: data,
    });
    expect(body).to.include('form-data; name="foo"');
  });

  it('204 no content', async () => {
    const res = await $fetch(getURL('204'));
    expect(res).toBeUndefined();
  });

  it('HEAD no content', async () => {
    const res = await $fetch(getURL('/ok'), { method: 'HEAD' });
    expect(res).toBeUndefined();
  });
});

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
//       ctx.options.headers = { 'X-Global': 'yes' };
//       return next();
//     });
//     const requestMiddleware = vi.fn((ctx, next) => {
//       ctx.options.headers = { ...ctx.options.headers, 'X-Request': 'yes' };
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

import compose from './compose';
import { FetchOptions, Context, NextFunction, Middleware, CreateFetchOptions, FetchRequest, FetchResponse } from './types';
import { detectResponseType, isJSONSerializable, isPayloadMethod } from './utils';
import { ResponseType } from './types';
const nullBodyResponses = new Set([101, 204, 205, 304]);

async function onError(ctx: Context, error: Error) {
  // TODO: Throw normalized error
  //   const error = createFetchError(ctx);
  ctx.error = error;
  throw error;
}

async function fetchMiddleware(ctx: Context, next: NextFunction) {
  if (ctx.options.method) {
    ctx.options.method = ctx.options.method.toUpperCase();
  }

  if (ctx.options.body && isPayloadMethod(ctx.options.method)) {
    if (isJSONSerializable(ctx.options.body)) {
      ctx.options.body = typeof ctx.options.body === 'string' ? ctx.options.body : JSON.stringify(ctx.options.body);
      ctx.options.headers = new Headers(ctx.options.headers || {});

      if (!ctx.options.headers.has('content-type')) {
        ctx.options.headers.set('content-type', 'application/json');
      }

      if (!ctx.options.headers.has('accept')) {
        ctx.options.headers.set('accept', 'application/json');
      }
    }
  }

  if (typeof ctx.request === 'string') {
    if (ctx.options.baseURL) {
      ctx.request = ctx.options.baseURL + ctx.request;
    }

    if (ctx.options.query) {
      const params = new URLSearchParams(ctx.options.query);
      ctx.request = `${ctx.request}?${params.toString()}`;
    }
  }

  try {
    ctx.response = await fetch(ctx.request, ctx.options as RequestInit);

    const hasBody =
      (ctx.response.body || (ctx.response as any)._bodyInit) &&
      !nullBodyResponses.has(ctx.response.status) &&
      ctx.options.method !== 'HEAD';

    if (hasBody) {
      const responseType =
        ctx.options.responseType || detectResponseType(ctx.response.headers.get('content-type') || '');
      let responseData: any;
      switch (responseType) {
        case 'stream':
          responseData = ctx.response.body || (ctx.response as any)._bodyInit;
          break;
        default:
          responseData = await ctx.response[responseType]();
          break;
      }
      ctx.response._data = responseData;
    }

    if (ctx.response.status >= 400 && ctx.response.status < 600) {
      return await onError(ctx, new Error('Request failed'));
    }
  } catch (error) {
    return await onError(ctx, error as Error);
  }

  return await next();
}

export function createRequest(globalOptions: CreateFetchOptions = {}) {
  const { middlewares: globalMiddlewares = [], baseURL = '' } = globalOptions;

  const fetchRaw = async <T = any, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options: FetchOptions<R> = {}
  ) => {
    const ctx: Context<T> = {
      request: request,
      options: {
        baseURL,
        ...options,
        headers: options.headers || {},
      },
      response: undefined,
      error: undefined,
    };

    const requestMiddlewares: Middleware[] = options.middlewares || [];
    const allMiddlewares: Middleware[] = [...globalMiddlewares, ...requestMiddlewares, fetchMiddleware];
    try {
      const processResponse = compose(allMiddlewares);
      await processResponse(ctx);
      return ctx.response as FetchResponse<T>;
    } catch (error) {
      throw error;
    }
  };

  const $fetch = async <T = any, R extends ResponseType = 'json'>(request: FetchRequest, options?: FetchOptions<R>) => {
    const response = await fetchRaw(request, options);
    return response._data as T;
  };

  $fetch.raw = fetchRaw;

  return $fetch;
}

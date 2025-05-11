import compose from './compose';
import { FetchOptions, Context, NextFunction, Middleware, CreateFetchOptions, FetchRequest } from './types';
import { detectResponseType, isJSONSerializable, isPayloadMethod } from './utils';

const nullBodyResponses = new Set([101, 204, 205, 304]);

async function onError(ctx: Context, error: Error) {
  // TODO: Throw normalized error
  //   const error = createFetchError(ctx);
  ctx.error = error;
  throw error;
}

async function fetchMiddleware(ctx: Context, next: NextFunction) {
  const { options, request, response } = ctx;

  if (options.method) {
    options.method = options.method.toUpperCase();
  }

  if (options.body && isPayloadMethod(options.method)) {
    if (isJSONSerializable(options.body)) {
      options.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      options.headers = new Headers(options.headers || {});

      if (!options.headers.has('content-type')) {
        options.headers.set('content-type', 'application/json');
      }

      if (!options.headers.has('accept')) {
        options.headers.set('accept', 'application/json');
      }
    }
  }

  if (typeof request === 'string') {
    if (options.baseURL) {
      ctx.request = options.baseURL + request;
    }

    if (options.query) {
      const params = new URLSearchParams(options.query);
      ctx.request = `${ctx.request}?${params.toString()}`;
    }
  }

  try {
    ctx.response = await fetch(request, options as RequestInit);

    const hasBody =
      (ctx.response?.body || (response as any)?._bodyInit) &&
      !nullBodyResponses.has(ctx.response.status) &&
      options.method !== 'HEAD';

    if (hasBody) {
      const responseType = options.responseType || detectResponseType(ctx.response.headers.get('content-type') || '');
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

    if (ctx.response?.status >= 400 && ctx.response?.status < 600) {
      return await onError(ctx, new Error('Request failed'));
    }
  } catch (error) {
    return await onError(ctx, error as Error);
  }

  return await next();
}

function createRequest<T = any>(globalOptions: CreateFetchOptions = {}) {
  const { middlewares: globalMiddlewares = [], baseURL = '' } = globalOptions;

  const $fetch = async (request: FetchRequest, options: FetchOptions = {}) => {
    const ctx: Context<T> = {
      request: request,
      options: {
        baseURL,
        headers: {},
        ...options,
      },
      response: undefined,
      error: undefined,
    };

    const requestMiddlewares: Middleware[] = options.middlewares || [];
    const allMiddlewares: Middleware[] = [...globalMiddlewares, ...requestMiddlewares, fetchMiddleware];
    try {
      const processResponse = compose(allMiddlewares);
      await processResponse(ctx);
      return ctx.response?._data;
    } catch (error) {
      throw error;
    }
  };

  return $fetch;
}

export { createRequest };

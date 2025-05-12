export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'stream';

export interface FetchOptions<R extends ResponseType = ResponseType> extends Omit<RequestInit, 'body'> {
  baseURL?: string;

  body?: RequestInit['body'] | Record<string, any>;

  ignoreResponseError?: boolean;

  // params?: Record<string, any>;

  query?: Record<string, any>;

  responseType?: R;

  middlewares?: Middleware[];
}

export interface FetchResponse<T> extends Response {
  _data?: T;
}

export type FetchRequest = RequestInfo;

export interface ResponseData<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

export interface Context<T = any, R extends ResponseType = ResponseType> {
  request: FetchRequest;
  options: FetchOptions<R>;
  response: FetchResponse<T> | undefined;
  error?: Error;
}

export type CreateFetchOptions = {
  middlewares?: Middleware[];
  baseURL?: string;
}

export type NextFunction = () => any;

export type Middleware = (ctx: Context, next: NextFunction) => Promise<void> | void;

export type Fetch = typeof globalThis.fetch;

# Onion Fetch

Onion Fetch is a lightweight, middleware-based fetch library for browsers and Node.js, inspired by Koa.js. It provides a flexible and extensible way to make HTTP requests.

## Features

- Middleware-based architecture
- TypeScript support
- Easy to use API
- Works in both browser and Node.js environments

## Installation

```bash
npm install onion-fetch
# or
yarn add onion-fetch
# or
pnpm add onion-fetch
```

## Usage

```typescript
import { createRequest } from 'onion-fetch';

// Create a request instance with a base URL
const $fetch = createRequest({
  baseURL: 'https://api.example.com'
});

// Perform a GET request
async function fetchData() {
  try {
    const data = await $fetch('/data');
    console.log(data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchData();

// Perform a POST request
async function postData() {
  try {
    const data = await $fetch('/submit', {
      method: 'POST',
      body: { name: 'John Doe', age: 30 }
    });
    console.log(data);
  } catch (error) {
    console.error('Error posting data:', error);
  }
}

postData();
```

## API

### `createRequest(globalOptions?: CreateFetchOptions)`

Creates a new request instance.

- `globalOptions` (optional): Global options for the request instance.
  - `baseURL`: The base URL for all requests made by this instance.
  - `middlewares`: An array of global middlewares to be applied to all requests.
  - `...otherFetchOptions`: Any other standard `fetch` options to be applied globally.

Returns a generic request function `$fetch` with the following features:

- `$fetch<T = any>(request: string | URL, options?: FetchOptions): Promise<T>`: Makes a request and returns the response data.
  - `T`: Type of the response data (defaults to any)
  - `options.responseType`: Format of the response data ('json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream')
  - `options.middlewares`: Array of request-specific middlewares

- `$fetch.raw`: Returns the complete response object, including status code, headers, etc.

### `RequestOptions`

Extends standard `fetch` options and includes:

- `middlewares`: An array of request-specific middlewares.

### `Context`

The request context object, containing:

- `request`: Request-related information (URL or configuration)
- `options`: Request options (including headers, method, etc.)
- `response`: Response object (populated after request completion)
- `error`: Error object (if any error occurs during request)

### `Middleware`

A function with the signature `(ctx: Context, next: NextFunction) => Promise<void> | void`.

- `ctx`: The request context object containing `request` and `response` properties
- `next`: A function to call the next middleware in the chain

## Middlewares

Middlewares are functions that can process requests and responses using an onion model architecture. Each middleware can execute logic both before the request is sent and after the response is received, providing powerful request processing capabilities.

### Onion Model Execution Order

Middlewares are executed in the order they are added, following an "outside-in" pattern for request processing and an "inside-out" pattern for response processing:

1. Request phase: Starting from the first middleware, execute code before `next()` in sequence
2. Response phase: Starting from the last middleware, execute code after `next()` in reverse sequence

```typescript
import { createRequest, Middleware, Context, NextFunction } from 'onion-fetch';

// Middleware to track request timing
const timingMiddleware: Middleware = async (ctx: Context, next: NextFunction) => {
  const start = Date.now();
  console.log('⭐ Request started');
  
  await next(); // Wait for inner middlewares and request to complete
  
  const ms = Date.now() - start;
  console.log(`🏁 Request completed in ${ms}ms`);
};

// Middleware to add authentication token
const authMiddleware: Middleware = async (ctx: Context, next: NextFunction) => {
  console.log('📝 Adding auth info');
  ctx.request.options.headers = {
    ...ctx.request.options.headers,
    'Authorization': 'Bearer YOUR_TOKEN',
  };
  
  await next();
  
  console.log('✅ Auth request completed');
};

// Create request instance with middlewares executed in array order
const $fetch = createRequest({
  baseURL: 'https://api.example.com',
  middlewares: [timingMiddleware, authMiddleware],
});

// Make request, console will output in order:
// ⭐ Request started
// 📝 Adding auth info
// ✅ Auth request completed
// 🏁 Request completed in XXXms
await $fetch('/protected-data');
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
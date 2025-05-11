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
const request = createRequest('https://api.example.com');

// Perform a GET request
async function fetchData() {
  try {
    const response = await request.get('/data');
    console.log(response);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchData();

// Perform a POST request
async function postData() {
  try {
    const response = await request.post('/submit', { name: 'John Doe', age: 30 });
    console.log(response);
  } catch (error) {
    console.error('Error posting data:', error);
  }
}

postData();
```

## API

### `createRequest(baseUrl?: string, globalOptions?: GlobalOptions)`

Creates a new request instance.

- `baseUrl` (optional): The base URL for all requests made by this instance.
- `globalOptions` (optional): Global options for the request instance.
  - `middlewares`: An array of global middlewares to be applied to all requests.
  - `...otherFetchOptions`: Any other standard `fetch` options to be applied globally.

Returns an object with the following methods:

- `request(url: string, options?: RequestOptions): Promise<any>`: Makes a generic request.
- `get(url: string, options?: RequestOptions): Promise<any>`: Makes a GET request.
- `post(url: string, data?: BodyInit | null, options?: RequestOptions): Promise<any>`: Makes a POST request.

### `RequestOptions`

Extends standard `fetch` options and includes:

- `middlewares`: An array of request-specific middlewares.

### `Context`

The request context object, containing:

- `request`: Request-related information
  - `baseUrl`: Base URL
  - `url`: Request URL
  - `options`: Request options
- `response`: Response data (populated by middlewares)

### `Middleware`

A function with the signature `(ctx: Context, next: NextFunction) => Promise<void> | void`.

- `ctx`: The request context object containing `request` and `response` properties
- `next`: A function to call the next middleware in the chain

## Middlewares

Middlewares are functions that can process the request and response. They are executed in the order they are added.

```typescript
import { createRequest, Middleware, Context, NextFunction } from 'onion-fetch';

// Custom middleware to add an auth token
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

// All requests made with this instance will include the Authorization header
request.get('/protected-data');
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
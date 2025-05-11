import { Context, NextFunction, Middleware } from './types';

export default function compose(middlewares: Middleware[]) {
  if (!Array.isArray(middlewares)) throw new TypeError('Middleware stack must be an array!');
  for (const fn of middlewares) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!');
  }

  return (ctx: Context, next?: NextFunction) => {
    let index = -1;

    function dispatch(i: number) {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }
      index = i;

      let fn: Middleware | NextFunction | undefined = middlewares[i];
      if (i === middlewares.length) {
        fn = next;
      }

      if (!fn) {
        return Promise.resolve();
      }

      try {
        return Promise.resolve(fn(ctx, function next() {
          return dispatch(i + 1);
        }));
      } catch (err: any) {
        return Promise.reject(err);
      }
    }

    return dispatch(0);
  };
}

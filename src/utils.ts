import { ResponseType } from './types';

const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;

const textTypes = new Set(['image/svg', 'application/xml', 'application/xhtml', 'application/html']);

export function isPayloadMethod(method = 'GET') {
  return ['PATCH', 'POST', 'PUT', 'DELETE'].includes(method.toUpperCase());
}

export function isJSONSerializable(value: any) {
  if (value === undefined) {
    return false;
  }
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean' || t === null) {
    return true;
  }
  if (t !== 'object') {
    return false; // bigint, function, symbol, undefined
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  return (value.constructor && value.constructor.name === 'Object') || typeof value.toJSON === 'function';
}

export function detectResponseType(_contentType = ''): ResponseType {
  if (!_contentType) {
    return 'json';
  }

  // Value might look like: `application/json; charset=utf-8`
  const contentType = _contentType.split(';').shift() || '';

  if (JSON_RE.test(contentType)) {
    return 'json';
  }

  if (textTypes.has(contentType) || contentType.startsWith('text/')) {
    return 'text';
  }

  return 'blob';
}

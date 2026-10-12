/**
 * Response Library
 *
 * 성공 응답 포맷:
 *   { meta: { code: 200, message: 'ok' }, paginate: {...}, data: ... }
 * 에러 응답 포맷:
 *   { meta: { code: 4xx/5xx, message: '...' }, data: ... }
 */
import type { Context } from 'hono';
import type { ErrorKind } from '#config/global';
import type { Paginate } from '#lib/types';

export function success(c: Context, data?: unknown, paginate?: Paginate): Response {
	const body = {
		meta: { code: 200, message: 'ok' },
		paginate,
		data,
	};
	return c.json(body, 200);
}

export function error(c: Context, kind: ErrorKind, data?: unknown): Response {
	const body = {
		meta: { code: kind.code, message: kind.msg },
		data,
	};
	return c.json(body, kind.code);
}

/**
 * HTML 페이지 응답 (views/*.ts 가 만든 문자열)
 */
export function html(c: Context, content: string | Promise<string>, status: 200 | 400 | 404 = 200): Promise<Response> | Response {
	if (typeof content === 'string') return c.html(content, status);
	return content.then((text) => c.html(text, status));
}

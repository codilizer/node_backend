/**
 * Validator Library (zod)
 *
 * 공통 스키마 조각과, 요청 본문/쿼리/경로 파라미터를 검증해 타입이 붙은 값으로 돌려주는 helper.
 * 검증 실패 시 CustomError(badrequest, '<field> is failed: <reason>') 를 던진다.
 *
 * 사용:
 *   const body = await parseJson(c, z.object({ login_id: field.loginId, password: field.password }));
 */
import type { Context } from 'hono';
import { z } from 'zod';
import G from '#config/global';
import { CustomError } from '#lib/error';

/**
 * YYYYMMDD 또는 YYYY-MM-DD 문자열을 Date(UTC 0시) 로 바꾼다. 형식이 틀리면 null.
 */
export function toBirthday(str: string): Date | null {
	const compact = String(str).replace(/-/g, '');
	if (!/^[0-9]{8}$/.test(compact)) return null;
	const date = new Date(`${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T00:00:00Z`);
	return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 앞뒤 공백 제거 + \r\n → \n
 */
export function trimAndReplace(str: string): string {
	return String(str).trim().replace(/\r\n/g, '\n');
}

const VERSION_PATTERN = /^[0-9]+(\.[0-9]+){0,3}$/;

/**
 * 자주 쓰는 필드 스키마
 */
export const field = {
	/** 로그인 ID: 영문/숫자/밑줄 */
	loginId: z
		.string()
		.trim()
		.regex(new RegExp(`^[A-Za-z0-9_]{${G.digit.loginId.min},${G.digit.loginId.max}}$`), 'alphanumeric and underscore only'),

	/** 비밀번호: 공백 없는 출력 가능 ASCII */
	password: z.string().regex(new RegExp(`^[!-~]{${G.digit.password.min},${G.digit.password.max}}$`), 'invalid password format'),

	/** 표시 이름 */
	name: z.string().transform(trimAndReplace).pipe(z.string().min(G.digit.name.min).max(G.digit.name.max)),

	/** 이메일 (소문자로 정규화) */
	email: z.email().trim().toLowerCase(),

	/** 숫자 ID (문자열로 들어와도 숫자로 변환) */
	id: z.coerce.number().int().positive(),

	/** 생년월일 → Date */
	birthday: z.string().transform((value, ctx) => {
		const date = toBirthday(value);
		if (!date) {
			ctx.addIssue({ code: 'custom', message: 'YYYYMMDD or YYYY-MM-DD' });
			return z.NEVER;
		}
		return date;
	}),

	/** 앱 버전 문자열 1.2.3 */
	version: z.string().trim().regex(VERSION_PATTERN, 'x.y.z format'),

	/** 긴 텍스트 */
	text: (max: number) => z.string().transform(trimAndReplace).pipe(z.string().max(max)),

	/** http(s) URL */
	url: z.url({ protocol: /^https?$/ }),

	/** 'true' / '1' / true 를 boolean 으로 */
	boolish: z.preprocess((value) => {
		if (typeof value === 'boolean') return value;
		if (typeof value === 'number') return value === 1;
		if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
		return value;
	}, z.boolean()),

	/** 날짜 문자열 → Date */
	date: z.coerce.date(),
};

/**
 * 페이징 쿼리 (?limit=&page=&skip=&sort=)
 */
export const paginateQuery = z.object({
	limit: z.coerce.number().int().min(1).max(G.paginate.maxLimit).default(G.paginate.defaultLimit),
	page: z.coerce.number().int().min(1).default(1),
	skip: z.coerce.number().int().min(0).default(0),
	sort: z.string().trim().max(100).optional(),
	fields: z.enum(['tiny', 'small', 'normal', 'large', 'full']).optional(),
});
export type PaginateQuery = z.infer<typeof paginateQuery>;

/**
 * zod 에러를 '<field> is failed: <reason>' 한 줄로 만든다.
 */
function formatIssues(error: z.ZodError): string {
	const first = error.issues[0];
	if (!first) return 'validation failed';
	const path = first.path.length ? first.path.join('.') : 'body';
	return `${path} is failed: ${first.message}`;
}

function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
	const result = schema.safeParse(input);
	if (!result.success) throw new CustomError(G.err.badrequest, formatIssues(result.error));
	return result.data;
}

/**
 * JSON 본문 검증. 본문이 비어 있거나 JSON 이 아니면 빈 객체로 취급한다.
 */
export async function parseJson<T extends z.ZodType>(c: Context, schema: T): Promise<z.output<T>> {
	let body: unknown = {};
	try {
		body = await c.req.json();
	} catch {
		body = {};
	}
	return parseOrThrow(schema, body);
}

/**
 * form(urlencoded / multipart) 본문 검증
 */
export async function parseForm<T extends z.ZodType>(c: Context, schema: T): Promise<z.output<T>> {
	let body: unknown = {};
	try {
		body = await c.req.parseBody();
	} catch {
		body = {};
	}
	return parseOrThrow(schema, body);
}

/**
 * 쿼리 스트링 검증
 */
export function parseQuery<T extends z.ZodType>(c: Context, schema: T): z.output<T> {
	return parseOrThrow(schema, c.req.query());
}

/**
 * 경로 파라미터 검증
 */
export function parseParams<T extends z.ZodType>(c: Context, schema: T): z.output<T> {
	return parseOrThrow(schema, c.req.param());
}

export { z };

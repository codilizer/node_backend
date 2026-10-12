/**
 * 설정 파일에서 공통으로 사용하는 유틸리티
 *
 *  - env(): 환경 변수를 읽고 없으면 기본값을 돌려준다.
 *           기본값을 생략하면 '#need to specify' 가 들어가며,
 *           서버 기동 시 이 값이 남아 있는 항목을 경고 로그로 알려준다.
 *  - deepMerge(): _base.ts 설정 위에 환경별 설정을 덧씌운다.
 */
export const NEED_TO_SPECIFY = '#need to specify';

export function env(name: string, fallback: string = NEED_TO_SPECIFY): string {
	const value = process.env[name];
	if (value === undefined || value === '') return fallback;
	return value;
}

export function envInt(name: string, fallback: number): number {
	const value = process.env[name];
	if (value === undefined || value === '') return fallback;
	const parsed = parseInt(value, 10);
	return Number.isNaN(parsed) ? fallback : parsed;
}

export function envBool(name: string, fallback: boolean): boolean {
	const value = process.env[name];
	if (value === undefined || value === '') return fallback;
	return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function envList(name: string, fallback: string[]): string[] {
	const value = process.env[name];
	if (value === undefined || value === '') return fallback;
	return value.split(',').map((v) => v.trim()).filter(Boolean);
}

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 재귀 부분 타입. 환경별 설정 파일에서 일부 항목만 덧씌울 때 사용한다.
 */
export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * base 객체를 복사한 뒤 override 를 재귀적으로 덧씌운다. 원본은 변경하지 않는다.
 */
export function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
	const result = structuredClone(base) as PlainObject;
	if (!isPlainObject(override)) return result as T;

	for (const [key, value] of Object.entries(override)) {
		if (isPlainObject(value) && isPlainObject(result[key])) {
			result[key] = deepMerge(result[key] as object, value as DeepPartial<object>);
		} else {
			result[key] = value;
		}
	}
	return result as T;
}

/**
 * 설정 객체 안에서 '#need to specify' 가 남아 있는 경로 목록을 돌려준다.
 * 예) ['db.mysql.user', 'session.key']
 */
export function findUnspecified(obj: unknown, prefix = ''): string[] {
	const found: string[] = [];
	if (!isPlainObject(obj)) return found;

	for (const [key, value] of Object.entries(obj)) {
		const current = prefix ? `${prefix}.${key}` : key;
		if (value === NEED_TO_SPECIFY) {
			found.push(current);
		} else if (isPlainObject(value)) {
			found.push(...findUnspecified(value, current));
		}
	}
	return found;
}

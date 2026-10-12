/**
 * 요청 정보 helper (User-Agent 로 클라이언트 구분, 클라이언트 IP)
 */
import type { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { DeviceType } from '#lib/types';

export function getClient(ua?: string | null): DeviceType {
	if (!ua) return 'other';
	if (/ip(hone|od|ad)/i.test(ua)) return 'ios';
	if (/android/i.test(ua)) return 'android';
	return 'other';
}

/**
 * 클라이언트 IP. trustProxy 가 true 면 X-Forwarded-For 의 첫 값을 사용한다.
 */
export function getClientIp(c: Context, trustProxy: boolean): string {
	if (trustProxy) {
		const forwarded = c.req.header('x-forwarded-for');
		if (forwarded) return forwarded.split(',')[0].trim();
	}
	try {
		return getConnInfo(c).remote.address || '-';
	} catch {
		// 테스트(app.request) 등 소켓이 없는 환경
		return '-';
	}
}

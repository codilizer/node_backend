/**
 * Authenticate API (가입 / 로그인 / 로그아웃 / 비밀번호 재설정)
 */
import type { Context, Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseJson, field, z } from '#lib/validate';
import * as preroute from '#lib/preroute';
import { getClientIp } from '#lib/user_agent';
import authModel, { type LoginContext } from '#model/auth';
import { deviceType, userGender } from '#doc/main';
import type { AppEnv } from '#lib/types';

/**
 * 로그인 컨텍스트 (디바이스, IP 등)
 */
function createContext(c: Context<AppEnv>, body: { device_type?: string; app_version?: string; push_token?: string }): LoginContext {
	return {
		device: (body.device_type as LoginContext['device']) || c.get('userClient'),
		appVersion: body.app_version || c.req.header('X-App-Version'),
		pushToken: body.push_token,
		ip: getClientIp(c, G.config.server.trustProxy),
		userAgent: c.req.header('user-agent'),
	};
}

const deviceFields = {
	device_type: z.enum(deviceType).optional(),
	app_version: field.version.optional(),
	push_token: z.string().max(512).optional(),
};

export function register(app: Hono<AppEnv>): void {
	/**
	 * 회원 가입
	 *   body: login_id, password, name, email?, gender?, birthday?(YYYYMMDD)
	 *   응답: { user, accessToken, accessTokenExpire }
	 */
	app.post('/api/v1/auth/register', preroute.getMiddleware(), async (c) => {
		const body = await parseJson(
			c,
			z.object({
				login_id: field.loginId,
				password: field.password,
				name: field.name,
				email: field.email.optional(),
				gender: z.enum(userGender).optional(),
				birthday: field.birthday.optional(),
				...deviceFields,
			})
		);

		const result = await authModel.register(
			{ loginId: body.login_id, password: body.password, name: body.name, email: body.email, gender: body.gender, birthday: body.birthday },
			createContext(c, body)
		);
		return success(c, result);
	});

	/**
	 * 로그인
	 *   body: login_id, password, device_type?, app_version?, push_token?
	 *   응답: { user, accessToken, accessTokenExpire }
	 */
	app.post('/api/v1/auth/login', preroute.getMiddleware(), async (c) => {
		const body = await parseJson(
			c,
			z.object({
				login_id: z.string().trim().min(1).max(255),
				password: field.password,
				...deviceFields,
			})
		);

		const result = await authModel.login(body.login_id, body.password, createContext(c, body));
		return success(c, result);
	});

	/**
	 * 로그아웃 (토큰 폐기)
	 */
	app.post('/api/v1/auth/logout', preroute.getMiddleware({ isNeedsAuth: true }), async (c) => {
		await authModel.logout(preroute.requireLoginId(c));
		return success(c, true);
	});

	/**
	 * 비밀번호 재설정 메일 요청
	 *   body: email
	 *   계정 존재 여부와 무관하게 항상 성공을 돌려준다.
	 */
	app.post('/api/v1/auth/password/reset', preroute.getMiddleware(), async (c) => {
		const body = await parseJson(c, z.object({ email: field.email }));
		await authModel.requestPasswordReset(body.email);
		return success(c, true);
	});

	/**
	 * 재설정 토큰으로 비밀번호 변경
	 *   body: token, password
	 */
	app.post('/api/v1/auth/password/reset/confirm', preroute.getMiddleware(), async (c) => {
		const body = await parseJson(
			c,
			z.object({
				token: z.string().min(10).max(128),
				password: field.password,
			})
		);
		await authModel.resetPasswordByToken(body.token, body.password);
		return success(c, true);
	});
}

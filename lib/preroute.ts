/**
 * Pre routing (API 서버용 인증 미들웨어)
 *
 * 사용:
 *   app.get('/api/v1/me', preroute.getMiddleware({ isNeedsAuth: true }), handler)
 *
 * 옵션:
 *   isNeedsAuth : true 면 액세스 토큰이 반드시 유효해야 한다. false(기본)면 토큰이 있을 때만 사용자를 채운다.
 *
 * 성공 시 컨텍스트 변수에 아래 값이 들어간다.
 *   currentUser, loginId(=user._id), userClient('ios' | 'android' | 'other')
 */
import type { MiddlewareHandler } from 'hono';
import G from '#config/global';
import { getAccessTokenFromRequest } from '#lib/auth';
import cache from '#lib/cache';
import { getClient } from '#lib/user_agent';
import { CustomError } from '#lib/error';
import type { AppEnv } from '#lib/types';

export interface PrerouteParam {
	isNeedsAuth?: boolean;
}

export function getMiddleware(param: PrerouteParam = {}): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		c.set('userClient', getClient(c.req.header('user-agent')));

		const accessToken = getAccessTokenFromRequest(c);
		if (!accessToken) {
			if (param.isNeedsAuth) throw new CustomError(G.err.unauthorized, 'access token required');
			return next();
		}

		// 모델은 DB 접속 후 로드되어야 하므로 여기서 import 한다.
		const { default: userModel } = await import('#model/user');
		const userInfo = await userModel.getByAccessToken(accessToken);

		if (!userInfo) {
			if (param.isNeedsAuth) throw new CustomError(G.err.unauthorized, 'invalid access token');
			return next();
		}
		if (userInfo.auth?.accessTokenExpire && userInfo.auth.accessTokenExpire < new Date()) {
			throw new CustomError(G.err.unauthorized, 'access token expired');
		}
		if (userInfo.deleteFlag) {
			throw new CustomError(G.err.forbidden, 'user is retired');
		}
		if (userInfo.status?.forbidden) {
			throw new CustomError(G.err.forbidden, 'user is forbidden');
		}

		// 관리자가 강제 로그아웃 시킨 사용자
		const forceLogout = await cache.getForceLogout(userInfo._id);
		if (forceLogout) {
			await userModel.clearAccessToken(userInfo._id);
			await cache.removeForceLogout(userInfo._id);
			throw new CustomError(G.err.unauthorized, 'force logout');
		}

		c.set('currentUser', userInfo);
		c.set('loginId', userInfo._id);
		return next();
	};
}

/**
 * 컨텍스트에서 로그인 사용자 ID 를 꺼낸다. (isNeedsAuth 미들웨어 뒤에서만 사용)
 */
export function requireLoginId(c: { get: (key: 'loginId') => number | undefined }): number {
	const loginId = c.get('loginId');
	if (!loginId) throw new CustomError(G.err.unauthorized, 'unauthorized');
	return loginId;
}

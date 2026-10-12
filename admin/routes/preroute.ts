/**
 * Admin Pre routing (인증 체크)
 *
 * 세션의 관리자 로그인 여부를 확인해 컨텍스트 변수(loginId, authority, adminUserId, adminName)에 넣는다.
 *   - /api/v1/admin/auth/login 은 통과
 *   - 그 외 /api/* 는 미로그인 시 401 JSON
 *   - HTML(SPA) 요청은 그대로 통과시키고, React 쪽에서 /api/v1/admin/me 결과를 보고 로그인 화면으로 보낸다
 */
import type { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import G from '#config/global';
import { CustomError } from '#lib/error';
import type { AdminEnv, AdminRole } from '#lib/types';

const PUBLIC_API_PATHS = ['/api/v1/admin/auth/login'];

export function register(app: Hono<AdminEnv>): void {
	app.use(async (c, next) => {
		// 로컬 개발 편의: 설정에서 skipAuth 가 true 면 admin 권한으로 통과
		if (G.adminConfig.skipAuth) {
			c.set('loginId', 'local_admin');
			c.set('authority', 'admin');
			c.set('adminUserId', 0);
			c.set('adminName', 'local admin');
			return next();
		}

		const session = c.get('session');
		if (session.isLoggedIn) {
			c.set('loginId', session.get('loginId'));
			c.set('authority', session.get('authority'));
			c.set('adminUserId', session.get('adminUserId'));
			c.set('adminName', session.get('adminName'));
			return next();
		}

		if (c.req.path.startsWith('/api') && !PUBLIC_API_PATHS.includes(c.req.path)) {
			throw new CustomError(G.err.unauthorized, 'unAuthorized');
		}
		return next();
	});
}

/**
 * 라우트 단위 권한 체크 미들웨어
 *   app.delete('/api/v1/admin/user/:id', requireRole('admin'), handler)
 */
export function requireRole(...roles: AdminRole[]) {
	return createMiddleware<AdminEnv>(async (c, next) => {
		const authority = c.get('authority');
		if (!authority || !roles.includes(authority)) {
			throw new CustomError(G.err.forbidden, 'no authority', { message: G.message.err.adminOnly });
		}
		await next();
	});
}

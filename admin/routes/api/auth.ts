/**
 * Admin Auth API (로그인 / 로그아웃 / 내 정보 / 비밀번호)
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseJson, parseParams, field, z } from '#lib/validate';
import { CustomError } from '#lib/error';
import authModel from '#model/auth';
import adminModel from '#model/admin';
import type { AdminEnv } from '#lib/types';

export function register(app: Hono<AdminEnv>): void {
	/**
	 * 관리자 로그인
	 *   body: id, password
	 */
	app.post('/api/v1/admin/auth/login', async (c) => {
		const body = await parseJson(
			c,
			z.object({
				id: z.string().trim().min(1).max(100),
				password: z.string().min(1).max(200),
			})
		);

		const admin = await adminModel.login(body.id, body.password);

		// 세션 고정 공격 방지를 위해 세션을 재생성한다.
		const session = c.get('session');
		session.regenerate();
		session.set('loginId', admin.adminId);
		session.set('authority', admin.role);
		session.set('adminUserId', admin._id);
		session.set('adminName', admin.name || admin.adminId);

		return success(c, { loginId: admin.adminId, authority: admin.role, adminUserId: admin._id, name: admin.name || admin.adminId, bootstrap: !!admin.bootstrap });
	});

	/**
	 * 로그아웃
	 */
	app.post('/api/v1/admin/auth/logout', (c) => {
		c.get('session').destroy();
		return success(c, true);
	});

	/**
	 * 현재 로그인한 관리자 정보
	 */
	app.get('/api/v1/admin/me', (c) => {
		return success(c, {
			loginId: c.get('loginId'),
			authority: c.get('authority'),
			adminUserId: c.get('adminUserId'),
			name: c.get('adminName'),
			env: G.env,
		});
	});

	/**
	 * 관리자 본인 비밀번호 변경
	 */
	app.put('/api/v1/admin/me/password', async (c) => {
		const body = await parseJson(
			c,
			z.object({
				current_password: field.password,
				new_password: field.password,
			})
		);
		const adminUserId = c.get('adminUserId');
		if (!adminUserId) throw new CustomError(G.err.badrequest, 'bootstrap account cannot change password here');

		await adminModel.changeOwnPassword(adminUserId, body.current_password, body.new_password);
		return success(c, true);
	});

	/**
	 * 회원 비밀번호 초기화 → 임시 비밀번호 발급 (이메일이 있으면 메일 발송)
	 * 메일을 보낼 수 없는 경우(이메일 미등록/메일 비활성)에는 관리자가 직접 전달할 수 있도록 임시 비밀번호를 돌려준다.
	 */
	app.post('/api/v1/admin/user/:userId/password/reset', async (c) => {
		const { userId } = parseParams(c, z.object({ userId: field.id }));
		const result = await authModel.issueTemporaryPassword(userId);
		return success(c, result);
	});
}

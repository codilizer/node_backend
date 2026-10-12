/**
 * Admin User API (관리자 계정 관리, admin 권한 전용)
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseJson, parseParams, parseQuery, paginateQuery, field, z } from '#lib/validate';
import { CustomError } from '#lib/error';
import { requireRole } from '../preroute.ts';
import adminModel from '#model/admin';
import { adminRole, adminStatus } from '#doc/main';
import type { AdminEnv } from '#lib/types';

const idParam = z.object({ id: field.id });

export function register(app: Hono<AdminEnv>): void {
	const adminOnly = requireRole('admin');

	app.get('/api/v1/admin/admin_users', adminOnly, async (c) => {
		const query = parseQuery(c, paginateQuery);
		const { list, paginate } = await adminModel.getAdminList({ fields: query.fields, paginate: query });
		return success(c, list, paginate);
	});

	/**
	 * 관리자 생성
	 *   body: admin_id, password, name?, email?, role
	 */
	app.post('/api/v1/admin/admin_users', adminOnly, async (c) => {
		const body = await parseJson(
			c,
			z.object({
				admin_id: field.loginId,
				password: field.password,
				name: field.name.optional(),
				email: field.email.or(z.literal('')).optional(),
				role: z.enum(adminRole).default('operator'),
			})
		);

		const admin = await adminModel.createAdmin({
			adminId: body.admin_id,
			password: body.password,
			name: body.name || body.admin_id,
			email: body.email || undefined,
			role: body.role,
		});
		const { password: _password, ...safe } = admin;
		return success(c, safe);
	});

	/**
	 * 관리자 수정 (이름/이메일/권한/상태)
	 */
	app.put('/api/v1/admin/admin_users/:id', adminOnly, async (c) => {
		const { id } = parseParams(c, idParam);
		const body = await parseJson(
			c,
			z.object({
				name: field.name.optional(),
				email: field.email.or(z.literal('')).optional(),
				role: z.enum(adminRole).optional(),
				status: z.enum(adminStatus).optional(),
			})
		);
		if (Object.values(body).every((v) => v === undefined)) throw new CustomError(G.err.badrequest, 'nothing to update');

		// 자기 자신의 권한/상태는 바꿀 수 없다 (실수로 잠기는 것 방지)
		if (id === c.get('adminUserId') && (body.role !== undefined || body.status !== undefined)) {
			throw new CustomError(G.err.badrequest, 'cannot change own role/status');
		}

		const admin = await adminModel.updateAdmin(id, body);
		return success(c, admin);
	});

	/**
	 * 관리자 비밀번호 초기화
	 */
	app.put('/api/v1/admin/admin_users/:id/password', adminOnly, async (c) => {
		const { id } = parseParams(c, idParam);
		const body = await parseJson(c, z.object({ password: field.password }));
		await adminModel.updateAdminPassword(id, body.password);
		return success(c, true);
	});

	/**
	 * 관리자 삭제
	 */
	app.delete('/api/v1/admin/admin_users/:id', adminOnly, async (c) => {
		const { id } = parseParams(c, idParam);
		if (id === c.get('adminUserId')) throw new CustomError(G.err.badrequest, 'cannot delete yourself');

		const count = await adminModel.deleteAdmin(id);
		if (count === 0) throw new CustomError(G.err.notfound, 'admin not found');
		return success(c, true);
	});
}

/**
 * Admin User API (회원 관리)
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseJson, parseParams, parseQuery, paginateQuery, field, z } from '#lib/validate';
import { CustomError } from '#lib/error';
import { requireRole } from '../preroute.ts';
import userModel from '#model/user';
import authModel from '#model/auth';
import { userGender } from '#doc/main';
import type { AdminEnv } from '#lib/types';

const userIdParam = z.object({ userId: field.id });

export function register(app: Hono<AdminEnv>): void {
	/**
	 * 회원 목록/검색
	 *   GET /api/v1/admin/users?type=all|loginId|name|email|userId&keyword=...&page=1&limit=20&include_retired=1&forbidden_only=1
	 */
	app.get('/api/v1/admin/users', async (c) => {
		const query = parseQuery(
			c,
			paginateQuery.extend({
				type: z.enum(['all', 'loginId', 'name', 'email', 'userId']).default('all'),
				keyword: z.string().trim().max(100).default(''),
				include_retired: field.boolish.optional(),
				forbidden_only: field.boolish.optional(),
			})
		);
		if (query.type === 'userId' && query.keyword && !/^[0-9]+$/.test(query.keyword)) {
			throw new CustomError(G.err.badrequest, 'keyword must be number');
		}

		const { list, paginate } = await userModel.search(query.type, query.keyword, { fields: query.fields, paginate: query }, {
			includeRetired: !!query.include_retired,
			forbiddenOnly: !!query.forbidden_only,
		});
		return success(c, list.map((user) => authModel.sanitize(user)), paginate);
	});

	/**
	 * 회원 상세
	 */
	app.get('/api/v1/admin/user/:userId', async (c) => {
		const { userId } = parseParams(c, userIdParam);
		const user = await userModel.getById(userId, { fields: 'large' });
		if (!user) throw new CustomError(G.err.notfound, 'user not found');
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 회원 로그인 이력
	 */
	app.get('/api/v1/admin/user/:userId/login_history', async (c) => {
		const { userId } = parseParams(c, userIdParam);
		const query = parseQuery(c, paginateQuery);
		const { list, paginate } = await userModel.getLoginHistory(userId, { paginate: query });
		return success(c, list, paginate);
	});

	/**
	 * 회원 정보 수정 (이름/성별/생년월일/소개)
	 *   빈 문자열은 "변경하지 않음" 으로 취급한다.
	 */
	app.put('/api/v1/admin/user/:userId', async (c) => {
		const { userId } = parseParams(c, userIdParam);
		const body = await parseJson(
			c,
			z.object({
				name: field.name.optional(),
				gender: z.enum(userGender).or(z.literal('')).optional(),
				birthday: field.birthday.or(z.literal('')).optional(),
				description: field.text(1000).optional(),
			})
		);
		const profile = {
			name: body.name,
			gender: body.gender === '' ? undefined : body.gender,
			birthday: body.birthday === '' ? undefined : body.birthday,
			description: body.description,
		};

		const user = await userModel.updateProfile(userId, profile);
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 관리자 메모
	 */
	app.put('/api/v1/admin/user/:userId/memo', async (c) => {
		const { userId } = parseParams(c, userIdParam);
		const body = await parseJson(c, z.object({ memo: field.text(2000).default('') }));

		const user = await userModel.updateMemo(userId, body.memo);
		if (!user) throw new CustomError(G.err.notfound, 'user not found');
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 이용 정지
	 */
	app.put('/api/v1/admin/user/:userId/forbidden', async (c) => {
		const { userId } = parseParams(c, userIdParam);
		const body = await parseJson(c, z.object({ reason: field.text(500).optional() }));
		const user = await userModel.forbid(userId, body.reason || G.message.admin?.forbiddenDefaultReason || 'policy violation');
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 이용 정지 해제
	 */
	app.delete('/api/v1/admin/user/:userId/forbidden', async (c) => {
		const { userId } = parseParams(c, userIdParam);
		const user = await userModel.recover(userId);
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 강제 로그아웃
	 */
	app.post('/api/v1/admin/user/:userId/logout', async (c) => {
		const { userId } = parseParams(c, userIdParam);
		await userModel.forceLogout(userId);
		return success(c, true);
	});

	/**
	 * 강제 탈퇴 (admin 전용)
	 */
	app.delete('/api/v1/admin/user/:userId', requireRole('admin'), async (c) => {
		const { userId } = parseParams(c, userIdParam);
		const user = await userModel.retire(userId);
		return success(c, authModel.sanitize(user));
	});
}

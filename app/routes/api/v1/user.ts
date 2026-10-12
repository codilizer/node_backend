/**
 * User API (다른 사용자 공개 정보)
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseParams, field, z } from '#lib/validate';
import * as preroute from '#lib/preroute';
import { CustomError } from '#lib/error';
import userModel from '#model/user';
import type { AppEnv } from '#lib/types';

export function register(app: Hono<AppEnv>): void {
	/**
	 * 사용자 공개 프로필 조회 (tiny 필드만)
	 */
	app.get('/api/v1/user/:userId', preroute.getMiddleware({ isNeedsAuth: true }), async (c) => {
		const { userId } = parseParams(c, z.object({ userId: field.id }));

		const user = await userModel.getById(userId, { fields: 'tiny' });
		if (!user || user.deleteFlag) throw new CustomError(G.err.notfound, 'user not found');
		return success(c, user);
	});
}

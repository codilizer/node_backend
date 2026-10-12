/**
 * Admin Dashboard API
 */
import type { Hono } from 'hono';
import { success } from '#lib/response';
import adminModel from '#model/admin';
import type { AdminEnv } from '#lib/types';

export function register(app: Hono<AdminEnv>): void {
	/**
	 * 대시보드 카운트. ?refresh=1 이면 캐시를 무시한다.
	 */
	app.get('/api/v1/admin/dashboard/counts', async (c) => {
		const counts = await adminModel.getDashboardCounts(c.req.query('refresh') === '1');
		return success(c, counts);
	});
}

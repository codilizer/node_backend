/**
 * Information API (운영 공지, 로그인 불필요)
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseParams, parseQuery, paginateQuery, field, z } from '#lib/validate';
import * as preroute from '#lib/preroute';
import { CustomError } from '#lib/error';
import informationModel from '#model/information';
import type { AppEnv } from '#lib/types';

export function register(app: Hono<AppEnv>): void {
	/**
	 * 공개 공지 목록
	 */
	app.get('/api/v1/information', preroute.getMiddleware(), async (c) => {
		const query = parseQuery(c, paginateQuery);
		const { list, paginate } = await informationModel.getPublished({ paginate: query });
		return success(c, list, paginate);
	});

	/**
	 * 공지 상세
	 */
	app.get('/api/v1/information/:id', preroute.getMiddleware(), async (c) => {
		const { id } = parseParams(c, z.object({ id: field.id }));
		const information = await informationModel.getById(id);
		if (!information.isPublished) throw new CustomError(G.err.notfound, 'information not found');
		return success(c, information);
	});
}

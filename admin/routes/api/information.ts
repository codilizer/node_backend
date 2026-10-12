/**
 * Admin Information API (운영 공지 관리)
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseJson, parseParams, parseQuery, paginateQuery, field, z } from '#lib/validate';
import { CustomError } from '#lib/error';
import informationModel from '#model/information';
import { informationType } from '#doc/main';
import type { AdminEnv } from '#lib/types';

const idParam = z.object({ id: field.id });

const informationBody = z.object({
	title: field.text(140).pipe(z.string().min(1)),
	content: field.text(20000).optional(),
	url: field.url.or(z.literal('')).optional(),
	type: z.enum(informationType).optional(),
	is_published: field.boolish.optional(),
	published_at: field.date.optional(),
});

export function register(app: Hono<AdminEnv>): void {
	/**
	 * 공지 전체 목록
	 */
	app.get('/api/v1/admin/information', async (c) => {
		const query = parseQuery(c, paginateQuery);
		const { list, paginate } = await informationModel.getAll({ fields: query.fields, paginate: query });
		return success(c, list, paginate);
	});

	app.get('/api/v1/admin/information/:id', async (c) => {
		const { id } = parseParams(c, idParam);
		return success(c, await informationModel.getById(id));
	});

	/**
	 * 공지 생성
	 *   body: title, content?, url?, type?, is_published?, published_at?
	 */
	app.post('/api/v1/admin/information', async (c) => {
		const body = await parseJson(c, informationBody);
		const information = await informationModel.insert({
			title: body.title,
			content: body.content,
			url: body.url,
			type: body.type,
			isPublished: body.is_published,
			publishedAt: body.published_at,
		});
		return success(c, information);
	});

	/**
	 * 공지 수정 (들어온 필드만 변경)
	 */
	app.put('/api/v1/admin/information/:id', async (c) => {
		const { id } = parseParams(c, idParam);
		const body = await parseJson(c, informationBody.partial());
		if (Object.values(body).every((v) => v === undefined)) throw new CustomError(G.err.badrequest, 'nothing to update');

		const information = await informationModel.update(id, {
			title: body.title,
			content: body.content,
			url: body.url,
			type: body.type,
			isPublished: body.is_published,
			publishedAt: body.published_at,
		});
		return success(c, information);
	});

	/**
	 * 공지 삭제
	 */
	app.delete('/api/v1/admin/information/:id', async (c) => {
		const { id } = parseParams(c, idParam);
		const count = await informationModel.deleteById(id);
		if (count === 0) throw new CustomError(G.err.notfound, 'information not found');
		return success(c, true);
	});
}

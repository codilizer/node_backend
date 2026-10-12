/**
 * Me API (내 정보)
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { success } from '#lib/response';
import { parseJson, parseQuery, paginateQuery, field, z } from '#lib/validate';
import * as preroute from '#lib/preroute';
import { saveUploadedFile } from '#lib/upload';
import { CustomError } from '#lib/error';
import authModel from '#model/auth';
import userModel from '#model/user';
import { deviceType, userGender } from '#doc/main';
import type { AppEnv } from '#lib/types';

export function register(app: Hono<AppEnv>): void {
	const needsAuth = preroute.getMiddleware({ isNeedsAuth: true });

	/**
	 * 내 정보 조회
	 */
	app.get('/api/v1/me', needsAuth, async (c) => {
		const query = parseQuery(c, z.object({ fields: z.enum(['tiny', 'small', 'normal', 'large']).optional() }));
		const user = await userModel.getById(preroute.requireLoginId(c), { fields: query.fields || 'normal' });
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 내 정보 수정
	 *   body: name?, gender?, birthday?(YYYYMMDD), description?
	 */
	app.put('/api/v1/me', needsAuth, async (c) => {
		const body = await parseJson(
			c,
			z.object({
				name: field.name.optional(),
				gender: z.enum(userGender).optional(),
				birthday: field.birthday.optional(),
				description: field.text(1000).optional(),
			})
		);
		if (Object.values(body).every((v) => v === undefined)) throw new CustomError(G.err.badrequest, 'parameter null');

		const user = await userModel.updateProfile(preroute.requireLoginId(c), body);
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 비밀번호 변경
	 *   body: current_password, new_password
	 */
	app.put('/api/v1/me/password', needsAuth, async (c) => {
		const body = await parseJson(
			c,
			z
				.object({
					current_password: field.password,
					new_password: field.password,
				})
				.refine((v) => v.current_password !== v.new_password, { message: 'new_password is same as current', path: ['new_password'] })
		);

		await authModel.changePassword(preroute.requireLoginId(c), body.current_password, body.new_password);
		// 비밀번호 변경 후 토큰은 폐기되므로 다시 로그인하도록 안내한다.
		return success(c, { relogin: true });
	});

	/**
	 * 프로필 이미지 업로드 (multipart/form-data, field: file)
	 */
	app.put('/api/v1/me/picture', needsAuth, async (c) => {
		const body = await c.req.parseBody();
		const url = await saveUploadedFile(body.file, G.path.image.profile, `${G.config.url.img}/profile`);
		const user = await userModel.updatePicture(preroute.requireLoginId(c), url);
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 디바이스/푸시 토큰 갱신
	 *   body: device_type?, push_token?, app_version?
	 */
	app.put('/api/v1/me/device', needsAuth, async (c) => {
		const body = await parseJson(
			c,
			z.object({
				device_type: z.enum(deviceType).optional(),
				push_token: z.string().max(512).optional(),
				app_version: field.version.optional(),
			})
		);
		const user = await userModel.updateDevice(preroute.requireLoginId(c), {
			type: body.device_type || c.get('userClient'),
			pushToken: body.push_token,
			appVersion: body.app_version,
		});
		return success(c, authModel.sanitize(user));
	});

	/**
	 * 내 로그인 이력
	 */
	app.get('/api/v1/me/login_history', needsAuth, async (c) => {
		const query = parseQuery(c, paginateQuery);
		const { list, paginate } = await userModel.getLoginHistory(preroute.requireLoginId(c), { paginate: query });
		return success(c, list, paginate);
	});

	/**
	 * 탈퇴
	 */
	app.delete('/api/v1/me', needsAuth, async (c) => {
		await userModel.retire(preroute.requireLoginId(c));
		return success(c, true);
	});
}

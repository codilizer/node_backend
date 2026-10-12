/**
 * Web (비밀번호 재설정 페이지)
 * 메일로 받은 링크(/password/reset?token=...)에서 새 비밀번호를 입력한다.
 */
import type { Hono } from 'hono';
import G from '#config/global';
import { parseForm, field, z } from '#lib/validate';
import { CustomError } from '#lib/error';
import authModel from '#model/auth';
import { passwordResetPage } from '../../views/password_reset.ts';
import type { AppEnv } from '#lib/types';

export function register(app: Hono<AppEnv>): void {
	app.get('/password/reset', (c) => {
		const token = c.req.query('token') || '';
		return c.html(passwordResetPage({ token, done: false, alert: null }));
	});

	app.post('/password/reset', async (c) => {
		const form = await parseForm(
			c,
			z.object({
				token: z.string().default(''),
				password: z.string().default(''),
				password_confirm: z.string().default(''),
			})
		);

		let alert: string | null = null;
		if (!field.password.safeParse(form.password).success) {
			alert = `비밀번호는 공백 없이 ${G.digit.password.min}~${G.digit.password.max}자로 입력해 주세요.`;
		} else if (form.password !== form.password_confirm) {
			alert = '비밀번호 확인이 일치하지 않습니다.';
		}
		if (alert) {
			return c.html(passwordResetPage({ token: form.token, done: false, alert }), 400);
		}

		try {
			await authModel.resetPasswordByToken(form.token, form.password);
			return c.html(passwordResetPage({ token: '', done: true, alert: null }));
		} catch (err) {
			const message = err instanceof CustomError && (err.body as { message?: string } | undefined)?.message;
			return c.html(passwordResetPage({ token: form.token, done: false, alert: message || '비밀번호 재설정에 실패했습니다.' }), 400);
		}
	});
}

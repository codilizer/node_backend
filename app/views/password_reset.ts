/**
 * 비밀번호 재설정 페이지
 */
import { html, layout } from './layout.ts';

export interface PasswordResetPageOptions {
	token: string;
	done: boolean;
	alert: string | null;
}

export function passwordResetPage({ token, done, alert }: PasswordResetPageOptions) {
	let body;
	if (done) {
		body = html`<p class="notice">비밀번호가 변경되었습니다. 앱에서 새 비밀번호로 로그인해 주세요.</p>`;
	} else if (!token) {
		body = html`
			${alert ? html`<p class="alert">${alert}</p>` : ''}
			<p class="alert">유효하지 않은 링크입니다. 비밀번호 재설정을 다시 요청해 주세요.</p>
		`;
	} else {
		body = html`
			${alert ? html`<p class="alert">${alert}</p>` : ''}
			<form method="post" action="/password/reset">
				<input type="hidden" name="token" value="${token}" />
				<label><span>새 비밀번호</span><input type="password" name="password" required autocomplete="new-password" /></label>
				<label><span>새 비밀번호 확인</span><input type="password" name="password_confirm" required autocomplete="new-password" /></label>
				<button type="submit">변경하기</button>
			</form>
		`;
	}

	return layout({
		title: '비밀번호 재설정',
		content: html`<h1>비밀번호 재설정</h1>${body}`,
	});
}

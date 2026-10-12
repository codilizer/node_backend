/**
 * 이용약관 / 개인정보처리방침 페이지
 */
import { html, layout } from './layout.ts';

export function policyPage() {
	return layout({
		title: '이용약관 / 개인정보처리방침',
		content: html`
			<h1>이용약관 / 개인정보처리방침</h1>
			<p>이 페이지의 내용은 서비스에 맞게 작성해 주세요. (#need to specify)</p>
		`,
	});
}

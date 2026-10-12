/**
 * API 안내 페이지
 */
import { html, layout } from './layout.ts';

const endpoints: [string, string, string][] = [
	['GET', '/api/v1/health', '헬스체크'],
	['GET', '/api/v1/app/version', '앱 버전 / 강제 업데이트 확인'],
	['POST', '/api/v1/auth/register', '회원 가입'],
	['POST', '/api/v1/auth/login', '로그인 (액세스 토큰 발급)'],
	['POST', '/api/v1/auth/logout', '로그아웃'],
	['POST', '/api/v1/auth/password/reset', '비밀번호 재설정 메일 요청'],
	['POST', '/api/v1/auth/password/reset/confirm', '재설정 토큰으로 비밀번호 변경'],
	['GET / PUT / DELETE', '/api/v1/me', '내 정보 조회 / 수정 / 탈퇴'],
	['PUT', '/api/v1/me/password', '비밀번호 변경'],
	['PUT', '/api/v1/me/picture', '프로필 이미지 업로드'],
	['PUT', '/api/v1/me/device', '디바이스 / 푸시 토큰 갱신'],
	['GET', '/api/v1/me/login_history', '내 로그인 이력'],
	['GET', '/api/v1/user/:userId', '사용자 공개 프로필'],
	['GET', '/api/v1/information', '운영 공지 목록'],
];

export function indexPage() {
	return layout({
		title: 'API Server',
		content: html`
			<h1>API Server</h1>
			<p>이 서버는 범용 API 서버입니다. 아래는 제공되는 주요 엔드포인트입니다.</p>
			<table class="api-table">
				<thead>
					<tr><th>Method</th><th>Path</th><th>설명</th></tr>
				</thead>
				<tbody>
					${endpoints.map(([method, path, desc]) => html`<tr><td>${method}</td><td>${path}</td><td>${desc}</td></tr>`)}
				</tbody>
			</table>
			<p>인증이 필요한 API 는 <code>X-Access-Token</code> 헤더 또는 <code>Authorization: Bearer &lt;token&gt;</code> 로 토큰을 전달합니다.</p>
		`,
	});
}

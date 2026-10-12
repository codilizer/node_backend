/**
 * 관리 서버 통합 테스트 (node --test)
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, json, type TestContext } from './helper.ts';

let ctx: TestContext;
let cookie = '';
const headers = () => ({ Cookie: cookie });

function pickCookie(setCookie: string | null): string {
	if (!setCookie) return '';
	return setCookie.split(';')[0];
}

before(async () => {
	ctx = await setup('admin');
	// 관리자 계정을 하나 만들어 둔다.
	const { default: adminModel } = await import('#model/admin');
	await adminModel.createAdmin({ adminId: 'root', password: 'RootPass1!', name: '루트', role: 'admin' });
	await adminModel.createAdmin({ adminId: 'op', password: 'OpPass123!', name: '운영자', role: 'operator' });
});

after(async () => {
	await ctx.teardown();
});

test('로그인 전 관리 API 는 401', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/admin/me');
	assert.equal(res.status, 401);
});

test('관리자 로그인 실패는 400, 성공하면 세션 쿠키 발급', async () => {
	const fail = await json(ctx.app, 'POST', '/api/v1/admin/auth/login', { id: 'root', password: 'wrong' });
	assert.equal(fail.status, 400);

	const ok = await json(ctx.app, 'POST', '/api/v1/admin/auth/login', { id: 'root', password: 'RootPass1!' });
	assert.equal(ok.status, 200, JSON.stringify(ok.body));
	assert.equal(ok.body.data.authority, 'admin');
	cookie = pickCookie(ok.headers.get('set-cookie'));
	assert.match(cookie, /^admin\.sid=/);
});

test('GET /api/v1/admin/me 는 로그인 정보를 돌려준다', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/admin/me', undefined, headers());
	assert.equal(res.status, 200);
	assert.equal(res.body.data.loginId, 'root');
	assert.equal(res.body.data.authority, 'admin');
});

test('대시보드 카운트', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/admin/dashboard/counts', undefined, headers());
	assert.equal(res.status, 200);
	assert.equal(res.body.data.users.total, 0);
});

test('공지 생성 → 목록 → 수정 → 삭제', async () => {
	const created = await json(ctx.app, 'POST', '/api/v1/admin/information', { title: '점검 안내', content: '내용', url: 'https://example.com' }, headers());
	assert.equal(created.status, 200, JSON.stringify(created.body));
	const id = created.body.data._id;

	const list = await json(ctx.app, 'GET', '/api/v1/admin/information', undefined, headers());
	assert.equal(list.body.paginate.total, 1);

	const updated = await json(ctx.app, 'PUT', `/api/v1/admin/information/${id}`, { is_published: false }, headers());
	assert.equal(updated.status, 200);
	assert.equal(updated.body.data.isPublished, false);

	const invalidUrl = await json(ctx.app, 'POST', '/api/v1/admin/information', { title: 'x', url: 'not-a-url' }, headers());
	assert.equal(invalidUrl.status, 400);

	const removed = await json(ctx.app, 'DELETE', `/api/v1/admin/information/${id}`, undefined, headers());
	assert.equal(removed.status, 200);
});

test('앱 버전 저장 / 조회', async () => {
	const saved = await json(ctx.app, 'PUT', '/api/v1/admin/version/ios', { version: '1.2.0', min_version: '1.0.0', store_url: 'https://apps.apple.com/app/id1' }, headers());
	assert.equal(saved.status, 200, JSON.stringify(saved.body));
	const list = await json(ctx.app, 'GET', '/api/v1/admin/versions', undefined, headers());
	assert.equal(list.body.data.length, 1);
	assert.equal(list.body.data[0].version, '1.2.0');
});

test('관리자 계정 목록/생성은 admin 권한만', async () => {
	const list = await json(ctx.app, 'GET', '/api/v1/admin/admin_users', undefined, headers());
	assert.equal(list.status, 200);
	assert.equal(list.body.data.length, 2);
	assert.equal(list.body.data[0].password, undefined, '비밀번호 해시는 응답에 포함되지 않는다');

	const opLogin = await json(ctx.app, 'POST', '/api/v1/admin/auth/login', { id: 'op', password: 'OpPass123!' });
	const opCookie = pickCookie(opLogin.headers.get('set-cookie'));
	const forbidden = await json(ctx.app, 'GET', '/api/v1/admin/admin_users', undefined, { Cookie: opCookie });
	assert.equal(forbidden.status, 403);
});

test('회원 검색 (빈 결과) 와 잘못된 userId', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/admin/users?type=all&keyword=', undefined, headers());
	assert.equal(res.status, 200);
	assert.deepEqual(res.body.data, []);

	const bad = await json(ctx.app, 'GET', '/api/v1/admin/user/abc', undefined, headers());
	assert.equal(bad.status, 400);

	const notFound = await json(ctx.app, 'GET', '/api/v1/admin/user/999', undefined, headers());
	assert.equal(notFound.status, 404);
});

test('로그아웃 후 세션 무효', async () => {
	const res = await json(ctx.app, 'POST', '/api/v1/admin/auth/logout', undefined, headers());
	assert.equal(res.status, 200);
	const me = await json(ctx.app, 'GET', '/api/v1/admin/me', undefined, headers());
	assert.equal(me.status, 401);
});

test('GET /admin 은 SPA 안내 HTML 을 돌려준다 (빌드 전에도 200)', async () => {
	const res = await ctx.app.request('/admin/users');
	assert.equal(res.status, 200);
	assert.match(res.headers.get('content-type') || '', /text\/html/);
});

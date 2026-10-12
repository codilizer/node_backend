/**
 * API 서버 통합 테스트 (node --test)
 *   npm test
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setup, json, type TestContext } from './helper.ts';

let ctx: TestContext;
let accessToken = '';
const loginId = 'tester01';
const password = 'Passw0rd!';

before(async () => {
	ctx = await setup('app');
});

after(async () => {
	await ctx.teardown();
});

test('GET /api/v1/health 는 200 과 meta.code 200 을 돌려준다', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/health');
	assert.equal(res.status, 200);
	assert.equal(res.body.meta.code, 200);
	assert.equal(res.body.data.status, 'ok');
});

test('없는 API 는 404 JSON 을 돌려준다', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/not_exists');
	assert.equal(res.status, 404);
	assert.equal(res.body.meta.code, 404);
});

test('회원 가입: 잘못된 입력은 400', async () => {
	const res = await json(ctx.app, 'POST', '/api/v1/auth/register', { login_id: 'a', password: '1', name: '' });
	assert.equal(res.status, 400);
	assert.match(res.body.meta.message, /bad request/);
});

test('회원 가입: 성공 시 accessToken 과 숫자 _id 를 돌려준다', async () => {
	const res = await json(ctx.app, 'POST', '/api/v1/auth/register', {
		login_id: loginId,
		password,
		name: '테스터',
		email: 'Tester@Example.com',
		gender: 'other',
		birthday: '19900101',
	});
	assert.equal(res.status, 200, JSON.stringify(res.body));
	assert.equal(typeof res.body.data.accessToken, 'string');
	assert.equal(res.body.data.user._id, 1);
	assert.equal(res.body.data.user.loginId, loginId);
	assert.equal(res.body.data.user.email, 'tester@example.com', '이메일은 소문자로 정규화');
	assert.equal(res.body.data.user.auth, undefined, 'auth 정보는 응답에 포함되지 않아야 한다');
});

test('회원 가입: 중복 login_id 는 409', async () => {
	const res = await json(ctx.app, 'POST', '/api/v1/auth/register', { login_id: loginId, password, name: '중복' });
	assert.equal(res.status, 409);
	assert.equal(res.body.data.message, '이미 사용 중인 아이디입니다.');
});

test('로그인: 비밀번호 틀리면 400, 맞으면 토큰 발급', async () => {
	const fail = await json(ctx.app, 'POST', '/api/v1/auth/login', { login_id: loginId, password: 'WrongPass1!' });
	assert.equal(fail.status, 400);

	const ok = await json(ctx.app, 'POST', '/api/v1/auth/login', { login_id: loginId, password });
	assert.equal(ok.status, 200, JSON.stringify(ok.body));
	accessToken = ok.body.data.accessToken;
	assert.ok(accessToken);
});

test('GET /api/v1/me: 토큰 없으면 401, 있으면 내 정보', async () => {
	const noToken = await json(ctx.app, 'GET', '/api/v1/me');
	assert.equal(noToken.status, 401);

	const res = await json(ctx.app, 'GET', '/api/v1/me', undefined, { 'X-Access-Token': accessToken });
	assert.equal(res.status, 200);
	assert.equal(res.body.data.loginId, loginId);

	const bearer = await json(ctx.app, 'GET', '/api/v1/me', undefined, { Authorization: `Bearer ${accessToken}` });
	assert.equal(bearer.status, 200);
});

test('PUT /api/v1/me: 이름 수정', async () => {
	const res = await json(ctx.app, 'PUT', '/api/v1/me', { name: '새이름' }, { 'X-Access-Token': accessToken });
	assert.equal(res.status, 200);
	assert.equal(res.body.data.name, '새이름');
});

test('GET /api/v1/me/login_history: 페이징 정보 포함', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/me/login_history?limit=5', undefined, { 'X-Access-Token': accessToken });
	assert.equal(res.status, 200);
	assert.ok(Array.isArray(res.body.data));
	assert.equal(res.body.paginate.limit, 5);
	assert.ok(res.body.paginate.total >= 2, '가입 + 로그인 2건 이상');
});

test('GET /api/v1/information: 공개 공지 목록 (빈 배열)', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/information');
	assert.equal(res.status, 200);
	assert.deepEqual(res.body.data, []);
});

test('GET /api/v1/app/version: 등록된 버전이 없으면 needUpdate false', async () => {
	const res = await json(ctx.app, 'GET', '/api/v1/app/version?type=ios&version=1.0.0');
	assert.equal(res.status, 200);
	assert.equal(res.body.data.needUpdate, false);
});

test('PUT /api/v1/me/password: 변경 후 기존 토큰은 무효', async () => {
	const res = await json(
		ctx.app,
		'PUT',
		'/api/v1/me/password',
		{ current_password: password, new_password: 'NewPassw0rd!' },
		{ 'X-Access-Token': accessToken }
	);
	assert.equal(res.status, 200);

	const me = await json(ctx.app, 'GET', '/api/v1/me', undefined, { 'X-Access-Token': accessToken });
	assert.equal(me.status, 401);

	const login = await json(ctx.app, 'POST', '/api/v1/auth/login', { login_id: loginId, password: 'NewPassw0rd!' });
	assert.equal(login.status, 200);
	accessToken = login.body.data.accessToken;
});

test('POST /api/v1/auth/logout 후 토큰 무효', async () => {
	const res = await json(ctx.app, 'POST', '/api/v1/auth/logout', undefined, { 'X-Access-Token': accessToken });
	assert.equal(res.status, 200);
	const me = await json(ctx.app, 'GET', '/api/v1/me', undefined, { 'X-Access-Token': accessToken });
	assert.equal(me.status, 401);
});

test('GET / 는 HTML 안내 페이지를 돌려준다', async () => {
	const res = await ctx.app.request('/');
	assert.equal(res.status, 200);
	const text = await res.text();
	assert.match(text, /API Server/);
});

test('GET /password/reset 은 토큰이 없으면 안내 문구를 보여준다', async () => {
	const res = await ctx.app.request('/password/reset');
	assert.equal(res.status, 200);
	assert.match(await res.text(), /유효하지 않은 링크/);
});

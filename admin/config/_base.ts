/**
 * 관리 서버(admin) 공통 설정
 *
 * API 서버 설정(app/config/_base.ts)을 바탕으로 포트/URL/세션/로그 경로만 바꾼다.
 * DB, 캐시, 메일 설정은 API 서버와 동일한 값을 사용한다.
 */
import path from 'node:path';
import { env, envInt, deepMerge } from '#config/util';
import type { AdminConfig } from '#config/types';
import appBase from '../../app/config/_base.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');

const merged = deepMerge(appBase, {
	name: 'admin',

	url: {
		base: env('ADMIN_BASE_URL', 'http://localhost:3001'),
		img: env('APP_BASE_URL', 'http://localhost:4000') + '/img',
	},

	server: {
		port: envInt('ADMIN_PORT', 3001),
	},

	log4js: {
		appenders: {
			app: {
				type: 'dateFile',
				filename: path.join(ROOT, 'logs', 'admin.log'),
				pattern: 'yyyy-MM-dd',
				keepFileExt: true,
				numBackups: 14,
			},
			access: {
				type: 'dateFile',
				filename: path.join(ROOT, 'logs', 'admin-access.log'),
				pattern: 'yyyy-MM-dd',
				keepFileExt: true,
				numBackups: 14,
			},
		},
	},

	session: {
		name: 'admin.sid',
		maxAge: 8 * 60 * 60 * 1000, // 관리자 세션은 8시간
		redis: {
			database: 2,
			prefix: 'sess:admin:',
		},
	},

	cache: {
		redis: {
			database: 3,
		},
	},
});

const base: AdminConfig = {
	...merged,

	/**
	 * true 면 로그인 없이 admin 권한으로 관리 페이지를 사용할 수 있다. (로컬 개발 전용)
	 */
	skipAuth: false,

	/**
	 * 비상용 관리자 계정
	 * DB(admin_user 컬렉션)에 관리자가 한 명도 없을 때만 이 계정으로 로그인할 수 있다.
	 * 비밀번호 해시는 `npm run hash-password -- <비밀번호>` 로 생성한다.
	 * 원본 프로젝트의 config.accounts 와 같은 역할이며 role 은 'admin' 으로 취급한다.
	 */
	accounts: {
		[env('ADMIN_BOOTSTRAP_ID', 'admin')]: env('ADMIN_BOOTSTRAP_PASSWORD_HASH'),
	},
};

export default base;

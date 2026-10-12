/**
 * 자동 테스트 환경 설정 (관리 서버)
 */
import { deepMerge } from '#config/util';
import base from './_base.ts';

export default deepMerge(base, {
	env: 'test',
	skipAuth: false,
	server: { port: 0 },
	log4js: {
		categories: {
			default: { appenders: ['console'], level: 'error' },
			action: { appenders: ['console'], level: 'error' },
			query: { appenders: ['console'], level: 'off' },
			critical: { appenders: ['console'], level: 'error' },
			access: { appenders: ['console'], level: 'off' },
		},
	},
	cache: { enable: false },
	mail: { enable: false },
	session: { key: 'test-admin-session-secret' },
	encrypt: { key: 'test-encrypt-key-32bytes-long!!!' },
});

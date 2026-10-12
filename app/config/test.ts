/**
 * 자동 테스트 환경 설정 (node --test)
 * MONGO_URI 는 테스트 코드에서 mongodb-memory-server 주소로 덮어쓴다.
 */
import { deepMerge } from '#config/util';
import base from './_base.ts';

export default deepMerge(base, {
	env: 'test',
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
	session: { key: 'test-session-secret' },
	encrypt: { key: 'test-encrypt-key-32bytes-long!!!' },
});

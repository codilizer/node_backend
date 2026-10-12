/**
 * 운영 환경 설정 (관리 서버)
 */
import { deepMerge } from '#config/util';
import base from './_base.ts';

export default deepMerge(base, {
	env: 'production',
	skipAuth: false,
	server: { trustProxy: true },
	session: { secure: true },
	log4js: {
		categories: {
			default: { appenders: ['app'], level: 'info' },
			action: { appenders: ['app'], level: 'info' },
			query: { appenders: ['app'], level: 'warn' },
			critical: { appenders: ['console', 'app'], level: 'info' },
			access: { appenders: ['access'], level: 'info' },
		},
	},
});

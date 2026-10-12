/**
 * 개발 서버 환경 설정 (관리 서버)
 */
import { deepMerge } from '#config/util';
import base from './_base.ts';

export default deepMerge(base, {
	env: 'development',
	skipAuth: false,
	server: { trustProxy: true },
	log4js: {
		categories: {
			default: { appenders: ['console', 'app'], level: 'debug' },
			action: { appenders: ['console', 'app'], level: 'debug' },
			query: { appenders: ['app'], level: 'info' },
			critical: { appenders: ['console', 'app'], level: 'info' },
			access: { appenders: ['access'], level: 'info' },
		},
	},
});

/**
 * 스테이징 환경 설정
 */
import { deepMerge } from '#config/util';
import base from './_base.ts';

export default deepMerge(base, {
	env: 'staging',
	server: {
		trustProxy: true,
	},
	session: {
		secure: true,
	},
	log4js: {
		categories: {
			default: { appenders: ['console', 'app'], level: 'info' },
			action: { appenders: ['console', 'app'], level: 'info' },
			query: { appenders: ['app'], level: 'info' },
			critical: { appenders: ['console', 'app'], level: 'info' },
			access: { appenders: ['access'], level: 'info' },
		},
	},
});

/**
 * 운영 환경 설정 (AWS EC2 등)
 *
 * 비밀 값은 모두 환경 변수(.env 또는 시스템 환경 변수)로 주입한다.
 * '#need to specify' 가 남아 있으면 서버 기동 시 경고 로그가 출력된다.
 */
import { deepMerge } from '#config/util';
import base from './_base.ts';

export default deepMerge(base, {
	env: 'production',
	server: {
		cluster: false, // pm2 cluster 모드(ecosystem.config.cjs)를 사용하므로 false
		trustProxy: true,
	},
	session: {
		secure: true,
	},
	log4js: {
		categories: {
			default: { appenders: ['app'], level: 'info' },
			action: { appenders: ['app'], level: 'info' },
			query: { appenders: ['app'], level: 'warn' },
			critical: { appenders: ['console', 'app'], level: 'info' },
			access: { appenders: ['access'], level: 'info' },
		},
	},
	push: {
		ios: { production: true },
	},
});

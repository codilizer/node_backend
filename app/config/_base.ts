/**
 * API 서버(app) 공통 설정
 *
 * 환경별 파일(localhost.ts, development.ts, staging.ts, production.ts)은 이 파일을 deepMerge 로 덧씌운다.
 * 비밀 값은 환경 변수에서 읽고, 없으면 '#need to specify' 가 들어간다. (운영 전 반드시 채울 것)
 */
import path from 'node:path';
import { env, envInt, envBool, envList } from '#config/util';
import type { BaseConfig } from '#config/types';

const ROOT = path.resolve(import.meta.dirname, '../..');

const base: BaseConfig = {
	name: 'app',
	env: 'localhost',
	country: env('COUNTRY', 'ko'),

	url: {
		base: env('APP_BASE_URL', 'http://localhost:4000'),
		img: env('APP_BASE_URL', 'http://localhost:4000') + '/img',
	},

	server: {
		port: envInt('APP_PORT', 4000),
		cluster: false, // true 면 CPU 수만큼 worker 를 띄운다. pm2 cluster 모드를 쓰면 false 유지.
		trustProxy: false, // ALB/Nginx 뒤에 둘 때 true (X-Forwarded-For 로 IP 판단)
		bodyLimit: 10 * 1024 * 1024, // JSON 본문 최대 크기 (byte)
	},

	log4js: {
		appenders: {
			console: { type: 'console' },
			app: {
				type: 'dateFile',
				filename: path.join(ROOT, 'logs', 'app.log'),
				pattern: 'yyyy-MM-dd',
				keepFileExt: true,
				numBackups: 14,
			},
			access: {
				type: 'dateFile',
				filename: path.join(ROOT, 'logs', 'app-access.log'),
				pattern: 'yyyy-MM-dd',
				keepFileExt: true,
				numBackups: 14,
			},
		},
		categories: {
			default: { appenders: ['console'], level: 'debug' },
			action: { appenders: ['console'], level: 'debug' },
			query: { appenders: ['console'], level: 'info' },
			critical: { appenders: ['console'], level: 'info' },
			access: { appenders: ['console'], level: 'info' },
		},
		access: {
			level: 'info',
		},
	},

	db: {
		mongo: {
			// key(main) 는 doc/main.ts 스키마 정의 파일 이름과 일치해야 한다.
			main: {
				uri: env('MONGO_URI', 'mongodb://localhost:27017/node_backend'),
				options: { maxPoolSize: 10 },
			},
		},
		mysql: {
			enable: envBool('MYSQL_ENABLE', false),
			host: env('MYSQL_HOST', 'localhost'),
			port: envInt('MYSQL_PORT', 3306),
			user: env('MYSQL_USER'),
			password: env('MYSQL_PASSWORD'),
			database: env('MYSQL_DATABASE', 'node_backend'),
			connectionLimit: 5,
		},
	},

	cache: {
		enable: envBool('REDIS_ENABLE', false), // false 면 프로세스 메모리 캐시로 동작
		redis: {
			url: env('REDIS_URL', 'redis://localhost:6379'),
			database: 0,
		},
		ttl: 604800, // 기본 만료(초) = 7일
	},

	session: {
		key: env('SESSION_SECRET'),
		name: 'app.sid',
		secure: false,
		maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
		redis: {
			url: env('REDIS_URL', 'redis://localhost:6379'),
			database: 1,
			prefix: 'sess:app:',
		},
	},

	cors: {
		origins: envList('CORS_ORIGINS', ['*']),
	},

	auth: {
		headerName: 'X-Access-Token', // 액세스 토큰 헤더. Authorization: Bearer 도 함께 허용
		tokenExpireDays: 30,
		passwordResetExpireMinutes: 30,
	},

	encrypt: {
		key: env('ENCRYPT_KEY'), // AES-256-GCM 용. 32byte 이상 권장
	},

	mail: {
		enable: envBool('MAIL_ENABLE', false), // false 면 실제 발송 대신 로그만 남긴다
		from: env('MAIL_FROM', 'noreply@example.com'),
		support: env('MAIL_SUPPORT', 'support@example.com'),
		smtp: {
			host: env('SMTP_HOST'),
			port: envInt('SMTP_PORT', 587),
			secure: false,
			auth: {
				user: env('SMTP_USER'),
				pass: env('SMTP_PASS'),
			},
		},
	},

	upload: {
		maxFileSize: 10 * 1024 * 1024, // 10MB
		allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
	},

	// 확장용: 푸시 알림 (현재는 설정 자리만 마련)
	push: {
		ios: {
			enable: false,
			production: false,
			keyId: env('APNS_KEY_ID'),
			teamId: env('APNS_TEAM_ID'),
			bundleId: env('APNS_BUNDLE_ID'),
		},
		android: {
			enable: false,
			serverKey: env('FCM_SERVER_KEY'),
		},
	},

	// 확장용: AWS
	aws: {
		region: env('AWS_REGION', 'ap-northeast-2'),
		s3: {
			bucket: env('AWS_S3_BUCKET'),
		},
	},
};

export default base;

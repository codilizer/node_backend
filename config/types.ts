/**
 * 설정 객체 타입 정의
 * app/config/_base.ts 가 이 타입을 만족하도록 작성하고, admin 설정은 그 위에 항목을 추가한다.
 */
import type { Configuration as Log4jsConfiguration } from 'log4js';

export type EnvName = 'localhost' | 'development' | 'staging' | 'production' | 'test';
export type ServerKind = 'app' | 'admin' | 'batch';

export interface Log4jsConfig {
	appenders: Log4jsConfiguration['appenders'];
	categories: Log4jsConfiguration['categories'];
	access: {
		level: string;
	};
}

export interface RedisConfig {
	url: string;
	database: number;
	prefix?: string;
}

export interface BaseConfig {
	name: string;
	env: EnvName;
	country: string;
	url: {
		base: string;
		img: string;
	};
	server: {
		port: number;
		cluster: boolean;
		trustProxy: boolean;
		bodyLimit: number;
	};
	log4js: Log4jsConfig;
	db: {
		mongo: Record<string, { uri: string; options?: Record<string, unknown> }>;
		mysql: {
			enable: boolean;
			host: string;
			port: number;
			user: string;
			password: string;
			database: string;
			connectionLimit: number;
		};
	};
	cache: {
		enable: boolean;
		redis: RedisConfig;
		ttl: number;
	};
	session: {
		key: string;
		name: string;
		secure: boolean;
		maxAge: number;
		redis: RedisConfig;
	};
	cors: {
		origins: string[];
	};
	auth: {
		headerName: string;
		tokenExpireDays: number;
		passwordResetExpireMinutes: number;
	};
	encrypt: {
		key: string;
	};
	mail: {
		enable: boolean;
		from: string;
		support: string;
		smtp: {
			host: string;
			port: number;
			secure: boolean;
			auth: { user: string; pass: string };
		};
	};
	upload: {
		maxFileSize: number;
		allowedMimeTypes: string[];
	};
	push: {
		ios: { enable: boolean; production: boolean; keyId: string; teamId: string; bundleId: string };
		android: { enable: boolean; serverKey: string };
	};
	aws: {
		region: string;
		s3: { bucket: string };
	};
}

/**
 * 관리 서버 전용 항목
 */
export interface AdminConfig extends BaseConfig {
	/** true 면 로그인 없이 admin 권한으로 통과 (로컬 개발 전용) */
	skipAuth: boolean;
	/** 비상용 관리자 계정 { 아이디: scrypt 해시 } */
	accounts: Record<string, string>;
}

export type AnyConfig = BaseConfig | AdminConfig;

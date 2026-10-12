/**
 * DB schema (MongoDB, db.mongo.main)
 *
 * 각 컬렉션은 { schema, fields, enums, indexes } 로 정의한다.
 *   schema  : mongoose 스키마 정의
 *   fields  : 조회 시 선택할 필드 묶음 (tiny/small/normal/large). 비어 있으면 전체 필드
 *   enums   : 값 목록. database.ts 가 { KEY: 'value' } 형태로 바꿔 collections[name].enums 에 넣는다
 *   indexes : 복합 인덱스 목록 [{ field1: 1, field2: -1, options: { unique: true } }]
 *
 * _id 는 counter 컬렉션으로 자동 채번되는 숫자이다. (model/db/base.ts insert 참고)
 */
import type { SchemaDefinition, SchemaOptions } from 'mongoose';

export interface CollectionDefinition {
	schema: SchemaDefinition;
	fields?: Record<string, string[]>;
	enums?: Record<string, readonly string[]>;
	indexes?: Array<Record<string, 1 | -1> & { options?: Record<string, unknown> }>;
	options?: SchemaOptions;
}

// enum 정의
export const userType = ['registering', 'normal', 'admin'] as const;
export const userGender = ['male', 'female', 'other'] as const;
export const deviceType = ['ios', 'android', 'other'] as const;
export const informationType = ['all', 'person', 'custom'] as const;
export const adminRole = ['admin', 'operator'] as const; // admin: 모든 기능, operator: 조회/운영 기능
export const adminStatus = ['active', 'inactive'] as const;

const collections: Record<string, CollectionDefinition> = {
	// 자동 채번용 컬렉션
	counter: {
		schema: {
			_id: { type: String },
			seq: { type: Number, default: 0 },
		},
	},

	// 회원
	user: {
		schema: {
			_id: { type: Number },
			loginId: { type: String, required: true, index: { unique: true } },
			email: { type: String, index: true },
			auth: {
				password: { type: String }, // scrypt 해시 (lib/auth.ts hashPassword)
				accessToken: { type: String, index: true },
				accessTokenExpire: { type: Date },
				passwordUpdatedAt: { type: Date },
			},
			type: { type: String, enum: userType, default: 'normal' },
			name: { type: String },
			gender: { type: String, enum: userGender },
			birthday: { type: Date },
			picture: {
				main: { type: String },
			},
			description: { type: String },
			device: {
				type: { type: String, enum: deviceType, default: 'other' },
				pushToken: { type: String },
				appVersion: { type: String },
			},
			status: {
				forbidden: { type: Boolean, default: false },
				forbiddenReason: { type: String },
				forbiddenAt: { type: Date },
				lastLoginAt: { type: Date },
				loginCount: { type: Number, default: 0 },
			},
			memo: { type: String }, // 관리자 메모
			created: { type: Date, default: Date.now },
			updated: { type: Date, default: Date.now },
			deleteFlag: { type: Boolean, default: false },
			deletedAt: { type: Date },
		},
		fields: {
			tiny: ['_id', 'loginId', 'name', 'picture', 'type', 'created'],
			small: ['_id', 'loginId', 'name', 'email', 'picture', 'type', 'gender', 'status', 'created', 'updated', 'deleteFlag'],
			normal: ['_id', 'loginId', 'name', 'email', 'picture', 'type', 'gender', 'birthday', 'description', 'device', 'status', 'created', 'updated', 'deleteFlag'],
			large: ['_id', 'loginId', 'name', 'email', 'picture', 'type', 'gender', 'birthday', 'description', 'device', 'status', 'memo', 'created', 'updated', 'deleteFlag', 'deletedAt'],
		},
		enums: {
			type: userType,
			gender: userGender,
			device: deviceType,
		},
		indexes: [
			{ name: 1 },
			{ created: -1 },
			{ 'status.forbidden': 1, deleteFlag: 1 },
		],
	},

	// 로그인 이력
	login: {
		schema: {
			_id: { type: Number },
			user: { type: Number, ref: 'user', index: true },
			device: { type: String, enum: deviceType },
			ip: { type: String },
			userAgent: { type: String },
			created: { type: Date, default: Date.now },
		},
		fields: {
			normal: ['_id', 'user', 'device', 'ip', 'userAgent', 'created'],
		},
		enums: {
			device: deviceType,
		},
		indexes: [{ user: 1, created: -1 }],
	},

	// 운영 공지
	information: {
		schema: {
			_id: { type: Number },
			title: { type: String, required: true },
			content: { type: String },
			url: { type: String },
			type: { type: String, enum: informationType, default: 'all' },
			isPublished: { type: Boolean, default: true },
			publishedAt: { type: Date, default: Date.now },
			created: { type: Date, default: Date.now },
			updated: { type: Date, default: Date.now },
		},
		fields: {
			small: ['_id', 'title', 'type', 'isPublished', 'publishedAt'],
			normal: ['_id', 'title', 'content', 'url', 'type', 'isPublished', 'publishedAt', 'created', 'updated'],
		},
		enums: {
			type: informationType,
		},
		indexes: [{ isPublished: 1, publishedAt: -1 }],
	},

	// 관리자 계정 (관리 서버 로그인용)
	admin_user: {
		schema: {
			_id: { type: Number },
			adminId: { type: String, required: true, index: { unique: true } },
			password: { type: String, required: true }, // scrypt 해시
			name: { type: String },
			email: { type: String },
			role: { type: String, enum: adminRole, default: 'operator' },
			status: { type: String, enum: adminStatus, default: 'active' },
			lastLoginAt: { type: Date },
			created: { type: Date, default: Date.now },
			updated: { type: Date, default: Date.now },
		},
		fields: {
			small: ['_id', 'adminId', 'name', 'role', 'status'],
			normal: ['_id', 'adminId', 'name', 'email', 'role', 'status', 'lastLoginAt', 'created', 'updated'],
		},
		enums: {
			role: adminRole,
			status: adminStatus,
		},
	},

	// 앱 버전 (디바이스 종류별 1건)
	version: {
		schema: {
			_id: { type: Number },
			type: { type: String, enum: deviceType, index: { unique: true } },
			version: { type: String }, // 최신 버전
			minVersion: { type: String }, // 이 버전 미만은 강제 업데이트
			storeUrl: { type: String },
			created: { type: Date, default: Date.now },
			updated: { type: Date, default: Date.now },
		},
		fields: {
			normal: ['type', 'version', 'minVersion', 'storeUrl', 'updated'],
		},
		enums: {
			type: deviceType,
		},
	},

	// 비밀번호 재설정 토큰
	temporary_password_reset: {
		schema: {
			_id: { type: Number },
			user: { type: Number, ref: 'user', index: true },
			token: { type: String, index: true },
			expire: { type: Date },
			used: { type: Boolean, default: false },
			created: { type: Date, default: Date.now },
		},
	},
};

export default collections;

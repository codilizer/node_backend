/**
 * 공통 타입 정의
 *  - DB 문서 타입 (doc/main.ts 스키마와 대응)
 *  - Hono 컨텍스트 변수 타입 (AppEnv / AdminEnv)
 */
import type { Session } from '#lib/session';

export type DeviceType = 'ios' | 'android' | 'other';
export type UserType = 'registering' | 'normal' | 'admin';
export type Gender = 'male' | 'female' | 'other';
export type AdminRole = 'admin' | 'operator';
export type AdminStatus = 'active' | 'inactive';
export type InformationType = 'all' | 'person' | 'custom';

// ---------- DB 문서 ----------

export interface UserDoc {
	_id: number;
	loginId: string;
	email?: string;
	auth?: {
		password?: string;
		accessToken?: string;
		accessTokenExpire?: Date;
		passwordUpdatedAt?: Date;
	};
	type: UserType;
	name?: string;
	gender?: Gender;
	birthday?: Date;
	picture?: { main?: string };
	description?: string;
	device?: { type?: DeviceType; pushToken?: string; appVersion?: string };
	status?: {
		forbidden: boolean;
		forbiddenReason?: string;
		forbiddenAt?: Date;
		lastLoginAt?: Date;
		loginCount: number;
	};
	memo?: string;
	created: Date;
	updated: Date;
	deleteFlag: boolean;
	deletedAt?: Date;
}

/** 응답용 (auth 제거) */
export type SafeUser = Omit<UserDoc, 'auth'>;

export interface LoginDoc {
	_id: number;
	user: number;
	device?: DeviceType;
	ip?: string;
	userAgent?: string;
	created: Date;
}

export interface InformationDoc {
	_id: number;
	title: string;
	content?: string;
	url?: string;
	type: InformationType;
	isPublished: boolean;
	publishedAt: Date;
	created: Date;
	updated: Date;
}

export interface AdminUserDoc {
	_id: number;
	adminId: string;
	password?: string;
	name?: string;
	email?: string;
	role: AdminRole;
	status: AdminStatus;
	lastLoginAt?: Date;
	created: Date;
	updated: Date;
}

export interface VersionDoc {
	_id: number;
	type: DeviceType;
	version?: string;
	minVersion?: string;
	storeUrl?: string;
	created: Date;
	updated: Date;
}

export interface PasswordResetDoc {
	_id: number;
	user: number;
	token: string;
	expire: Date;
	used: boolean;
	created: Date;
}

// ---------- 조회 파라미터 / 페이징 ----------

export interface PaginateParams {
	limit?: number;
	page?: number;
	skip?: number;
	sort?: string | null;
}

export interface Paginate {
	total: number;
	page: number;
	skip: number;
	limit: number;
	hasNext?: boolean;
}

export interface GetParams {
	fields: string;
	paginate: PaginateParams;
	search: {
		keyword: string | null;
		type: string | null;
		start: Date | null;
		end: Date | null;
	};
}

export interface PagedResult<T> {
	list: T[];
	paginate: Paginate;
}

// ---------- Hono 컨텍스트 변수 ----------

/** API 서버 */
export interface AppVariables {
	userClient: DeviceType;
	currentUser?: UserDoc;
	loginId?: number;
}
export type AppEnv = { Variables: AppVariables };

/** 관리 서버 */
export interface AdminVariables {
	session: Session;
	loginId?: string;
	authority?: AdminRole;
	adminUserId?: number;
	adminName?: string;
}
export type AdminEnv = { Variables: AdminVariables };

/** 관리자 로그인 결과 */
export interface AdminIdentity {
	_id: number;
	adminId: string;
	name?: string;
	role: AdminRole;
	status: AdminStatus;
	bootstrap?: boolean;
}

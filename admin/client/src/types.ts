/**
 * 관리 페이지에서 사용하는 서버 응답 타입
 * (서버 lib/types.ts 와 대응. Date 는 JSON 으로 오므로 string)
 */
export type DeviceType = 'ios' | 'android' | 'other';
export type Gender = 'male' | 'female' | 'other';
export type AdminRole = 'admin' | 'operator';
export type AdminStatus = 'active' | 'inactive';
export type InformationType = 'all' | 'person' | 'custom';

export interface Meta {
	code: number;
	message: string;
}

export interface Paginate {
	total: number;
	page: number;
	skip: number;
	limit: number;
}

export interface ApiResponse<T = unknown> {
	meta: Meta;
	paginate?: Paginate;
	data: T;
}

export interface AdminMe {
	loginId: string;
	authority: AdminRole;
	adminUserId: number;
	name: string;
	env: string;
}

export interface User {
	_id: number;
	loginId: string;
	email?: string;
	name?: string;
	gender?: Gender;
	birthday?: string;
	picture?: { main?: string };
	description?: string;
	device?: { type?: DeviceType; pushToken?: string; appVersion?: string };
	status: {
		forbidden: boolean;
		forbiddenReason?: string;
		forbiddenAt?: string;
		lastLoginAt?: string;
		loginCount: number;
	};
	memo?: string;
	created: string;
	updated: string;
	deleteFlag: boolean;
	deletedAt?: string;
}

export interface LoginHistory {
	_id: number;
	user: number;
	device?: DeviceType;
	ip?: string;
	userAgent?: string;
	created: string;
}

export interface Information {
	_id: number;
	title: string;
	content?: string;
	url?: string;
	type: InformationType;
	isPublished: boolean;
	publishedAt: string;
	created: string;
	updated: string;
}

export interface AdminUser {
	_id: number;
	adminId: string;
	name?: string;
	email?: string;
	role: AdminRole;
	status: AdminStatus;
	lastLoginAt?: string;
	created: string;
}

export interface AppVersion {
	type: DeviceType;
	version?: string;
	minVersion?: string;
	storeUrl?: string;
	updated?: string;
}

export interface DashboardCounts {
	users: { total: number; active: number; forbidden: number; retired: number };
	signups: { today: number; week: number };
	logins: { today: number; todayUsers: number; weekUsers: number };
	information: { published: number };
	generatedAt: string;
}

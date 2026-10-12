/**
 * API Service
 * 서버 응답은 항상 { meta: { code, message }, paginate, data } 형태이며 그대로 돌려준다.
 * 호출 측은 res.meta.code === 200 으로 성공 여부를 판단한다.
 * 401 이 오면 onUnauthorized 콜백을 호출해 로그인 화면으로 전환한다.
 */
import type { AdminMe, AdminUser, ApiResponse, AppVersion, DashboardCounts, DeviceType, Information, LoginHistory, User } from './types.ts';

const prefix = '/api/v1/admin';

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
	onUnauthorized = handler;
}

async function request<T>(method: string, uri: string, body?: unknown): Promise<ApiResponse<T>> {
	const options: RequestInit = {
		method,
		credentials: 'same-origin',
		headers: { Accept: 'application/json' },
	};
	if (body !== undefined) {
		(options.headers as Record<string, string>)['Content-Type'] = 'application/json';
		options.body = JSON.stringify(body);
	}
	const res = await fetch(uri, options);
	if (res.status === 401 && !uri.endsWith('/auth/login')) {
		onUnauthorized?.();
	}
	try {
		return (await res.json()) as ApiResponse<T>;
	} catch {
		return { meta: { code: res.status, message: res.statusText }, data: null as T };
	}
}

function query(params: Record<string, string | number | boolean | undefined | null>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== '' && value !== false) search.append(key, String(value === true ? 1 : value));
	}
	const text = search.toString();
	return text ? `?${text}` : '';
}

/**
 * 서버 에러 응답에서 사람이 읽을 메시지를 꺼낸다.
 */
export function errorMessage(res: ApiResponse<unknown>): string {
	if (!res || !res.meta) return '알 수 없는 오류';
	const data = res.data as { message?: string } | null;
	if (data && typeof data === 'object' && data.message) return data.message;
	return `${res.meta.code} ${res.meta.message}`;
}

export const api = {
	get: <T>(uri: string) => request<T>('GET', uri),
	post: <T>(uri: string, body?: unknown) => request<T>('POST', uri, body),
	put: <T>(uri: string, body?: unknown) => request<T>('PUT', uri, body),
	del: <T>(uri: string) => request<T>('DELETE', uri),

	// 인증
	login: (id: string, password: string) => request<AdminMe>('POST', `${prefix}/auth/login`, { id, password }),
	logout: () => request<boolean>('POST', `${prefix}/auth/logout`),
	getMe: () => request<AdminMe>('GET', `${prefix}/me`),
	changeMyPassword: (currentPassword: string, newPassword: string) =>
		request<boolean>('PUT', `${prefix}/me/password`, { current_password: currentPassword, new_password: newPassword }),

	// 대시보드
	getDashboardCounts: (refresh: boolean) => request<DashboardCounts>('GET', `${prefix}/dashboard/counts${query({ refresh })}`),

	// 회원
	searchUsers: (params: { type: string; keyword: string; page: number; limit?: number; include_retired?: boolean; forbidden_only?: boolean }) =>
		request<User[]>('GET', `${prefix}/users${query(params)}`),
	getUser: (userId: number | string) => request<User>('GET', `${prefix}/user/${userId}`),
	getUserLoginHistory: (userId: number | string, page: number, limit = 20) =>
		request<LoginHistory[]>('GET', `${prefix}/user/${userId}/login_history${query({ page, limit })}`),
	updateUser: (userId: number | string, data: { name?: string; gender?: string; birthday?: string; description?: string }) =>
		request<User>('PUT', `${prefix}/user/${userId}`, data),
	updateUserMemo: (userId: number | string, memo: string) => request<User>('PUT', `${prefix}/user/${userId}/memo`, { memo }),
	forbidUser: (userId: number | string, reason: string) => request<User>('PUT', `${prefix}/user/${userId}/forbidden`, { reason }),
	recoverUser: (userId: number | string) => request<User>('DELETE', `${prefix}/user/${userId}/forbidden`),
	forceLogoutUser: (userId: number | string) => request<boolean>('POST', `${prefix}/user/${userId}/logout`),
	retireUser: (userId: number | string) => request<User>('DELETE', `${prefix}/user/${userId}`),
	resetUserPassword: (userId: number | string) =>
		request<{ temporaryPassword: string; mailed: boolean }>('POST', `${prefix}/user/${userId}/password/reset`),

	// 공지
	getInformationAll: (page: number, limit = 20) => request<Information[]>('GET', `${prefix}/information${query({ page, limit })}`),
	insertInformation: (data: Record<string, unknown>) => request<Information>('POST', `${prefix}/information`, data),
	updateInformation: (id: number, data: Record<string, unknown>) => request<Information>('PUT', `${prefix}/information/${id}`, data),
	deleteInformation: (id: number) => request<boolean>('DELETE', `${prefix}/information/${id}`),

	// 관리자 계정
	getAdminUsers: () => request<AdminUser[]>('GET', `${prefix}/admin_users${query({ limit: 100 })}`),
	insertAdminUser: (data: Record<string, unknown>) => request<AdminUser>('POST', `${prefix}/admin_users`, data),
	updateAdminUser: (id: number, data: Record<string, unknown>) => request<AdminUser>('PUT', `${prefix}/admin_users/${id}`, data),
	updateAdminUserPassword: (id: number, password: string) => request<boolean>('PUT', `${prefix}/admin_users/${id}/password`, { password }),
	deleteAdminUser: (id: number) => request<boolean>('DELETE', `${prefix}/admin_users/${id}`),

	// 앱 버전
	getVersions: () => request<AppVersion[]>('GET', `${prefix}/versions`),
	updateVersion: (type: DeviceType, data: { version: string; min_version?: string; store_url?: string }) =>
		request<AppVersion>('PUT', `${prefix}/version/${type}`, data),
};

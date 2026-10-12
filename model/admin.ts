/**
 * Admin Model (관리자 인증 / 관리자 계정 / 대시보드)
 */
import G from '#config/global';
import * as authUtil from '#lib/auth';
import cache from '#lib/cache';
import { CustomError } from '#lib/error';
import { BaseModel } from '#model/base';
import dbAdminUser, { type UpdateAdminInput } from '#model/db/admin_user';
import dbUser from '#model/db/user';
import dbLogin from '#model/db/login';
import dbInformation from '#model/db/information';
import type { AdminIdentity, AdminRole, AdminUserDoc, PagedResult, PaginateParams } from '#lib/types';

export interface DashboardCounts {
	users: { total: number; active: number; forbidden: number; retired: number };
	signups: { today: number; week: number };
	logins: { today: number; todayUsers: number; weekUsers: number };
	information: { published: number };
	generatedAt: Date;
}

class AdminModel extends BaseModel {
	enums = dbAdminUser.enums;
	readonly ROLE = { ADMIN: 'admin', OPERATOR: 'operator' } as const satisfies Record<string, AdminRole>;

	/**
	 * 관리자 로그인
	 *  1) admin_user 컬렉션에서 조회
	 *  2) 컬렉션에 관리자가 한 명도 없으면 config.accounts(비상 계정)로 로그인 허용
	 */
	async login(adminId: string, password: string): Promise<AdminIdentity> {
		const admin = await dbAdminUser.getByAdminIdForAuth(adminId);

		if (admin) {
			if (admin.status !== 'active') {
				throw new CustomError(G.err.forbidden, 'admin inactive', { message: G.message.err.loginFailed });
			}
			if (!authUtil.verifyPassword(password, admin.password)) {
				throw new CustomError(G.err.badrequest, 'admin login failed', { message: G.message.err.loginFailed });
			}
			await dbAdminUser.updateLastLogin(admin._id);
			return { _id: admin._id, adminId: admin.adminId, name: admin.name, role: admin.role, status: admin.status };
		}

		// 비상 계정 (DB 에 관리자가 없을 때만)
		const adminCount = await dbAdminUser.count();
		const accounts = G.adminConfig.accounts || {};
		if (adminCount === 0 && accounts[adminId] && authUtil.verifyPassword(password, accounts[adminId])) {
			return { _id: 0, adminId, name: adminId, role: 'admin', status: 'active', bootstrap: true };
		}

		throw new CustomError(G.err.badrequest, 'admin login failed', { message: G.message.err.loginFailed });
	}

	/**
	 * 관리자 계정 생성
	 */
	async createAdmin({ adminId, password, name, email, role }: { adminId: string; password: string; name?: string; email?: string; role?: AdminRole }): Promise<AdminUserDoc> {
		const exists = await dbAdminUser.getByAdminId(adminId);
		if (exists) throw new CustomError(G.err.conflict, 'adminId duplicated');
		return dbAdminUser.insertAdmin({ adminId, passwordHash: authUtil.hashPassword(password), name, email, role });
	}

	getAdminList(params: { fields?: string; paginate: PaginateParams }): Promise<PagedResult<AdminUserDoc>> {
		return dbAdminUser.getAll(params);
	}

	getAdminById(id: number): Promise<AdminUserDoc | null> {
		return dbAdminUser.getById(id, 'normal');
	}

	async updateAdmin(id: number, data: UpdateAdminInput): Promise<AdminUserDoc> {
		const admin = await dbAdminUser.updateAdmin(id, data);
		if (!admin) throw new CustomError(G.err.notfound, 'admin not found');
		return admin;
	}

	async updateAdminPassword(id: number, password: string): Promise<AdminUserDoc> {
		const admin = await dbAdminUser.updatePassword(id, authUtil.hashPassword(password));
		if (!admin) throw new CustomError(G.err.notfound, 'admin not found');
		return admin;
	}

	/**
	 * 본인 비밀번호 변경 (현재 비밀번호 확인)
	 */
	async changeOwnPassword(id: number, currentPassword: string, newPassword: string): Promise<boolean> {
		const admin = await dbAdminUser.getById(id, ['_id', 'password']);
		if (!admin) throw new CustomError(G.err.notfound, 'admin not found');
		if (!authUtil.verifyPassword(currentPassword, admin.password)) {
			throw new CustomError(G.err.badrequest, 'password mismatch', { message: G.message.err.passwordMismatch });
		}
		await dbAdminUser.updatePassword(id, authUtil.hashPassword(newPassword));
		return true;
	}

	deleteAdmin(id: number): Promise<number> {
		return dbAdminUser.deleteById(id);
	}

	/**
	 * 대시보드 카운트. 10분 캐시.
	 */
	async getDashboardCounts(forceRefresh = false): Promise<DashboardCounts> {
		if (!forceRefresh) {
			const cached = await cache.getAdminCounter<DashboardCounts>('dashboard');
			if (cached) return cached;
		}

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
		const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

		const [totalUsers, activeUsers, forbiddenUsers, retiredUsers, todaySignups, weekSignups, todayLogins, todayLoginUsers, weekLoginUsers, informationCount] =
			await Promise.all([
				dbUser.count({}),
				dbUser.count({ deleteFlag: false, 'status.forbidden': false }),
				dbUser.count({ deleteFlag: false, 'status.forbidden': true }),
				dbUser.count({ deleteFlag: true }),
				dbUser.countCreatedBetween(todayStart, tomorrow),
				dbUser.countCreatedBetween(weekStart, tomorrow),
				dbLogin.countBetween(todayStart, tomorrow),
				dbLogin.countDistinctUsersBetween(todayStart, tomorrow),
				dbLogin.countDistinctUsersBetween(weekStart, tomorrow),
				dbInformation.count({ isPublished: true }),
			]);

		const counts: DashboardCounts = {
			users: { total: totalUsers, active: activeUsers, forbidden: forbiddenUsers, retired: retiredUsers },
			signups: { today: todaySignups, week: weekSignups },
			logins: { today: todayLogins, todayUsers: todayLoginUsers, weekUsers: weekLoginUsers },
			information: { published: informationCount },
			generatedAt: now,
		};
		await cache.setAdminCounter('dashboard', counts);
		return counts;
	}
}

const adminModel = new AdminModel();
export default adminModel;

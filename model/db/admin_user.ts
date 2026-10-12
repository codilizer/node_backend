/**
 * AdminUser Collection Operator (관리자 계정)
 */
import { BaseOperator } from '#model/db/base';
import type { AdminRole, AdminStatus, AdminUserDoc } from '#lib/types';

export interface InsertAdminInput {
	adminId: string;
	passwordHash: string;
	name?: string;
	email?: string;
	role?: AdminRole;
}

export interface UpdateAdminInput {
	name?: string;
	email?: string;
	role?: AdminRole;
	status?: AdminStatus;
}

class AdminUserOperator extends BaseOperator<AdminUserDoc> {
	constructor() {
		super('admin_user');
	}

	insertAdmin({ adminId, passwordHash, name, email, role }: InsertAdminInput): Promise<AdminUserDoc> {
		return this.insert({
			adminId,
			password: passwordHash,
			name: name || adminId,
			email,
			role: role || 'operator',
			status: 'active',
		});
	}

	/**
	 * 로그인용 조회 (password 포함)
	 */
	getByAdminIdForAuth(adminId: string): Promise<AdminUserDoc | null> {
		return this.findOne({ adminId }, [...this.fields.normal, 'password']);
	}

	getByAdminId(adminId: string): Promise<AdminUserDoc | null> {
		return this.findOne({ adminId }, 'normal');
	}

	updateLastLogin(id: number): Promise<AdminUserDoc | null> {
		return this.updateById(id, { lastLoginAt: new Date() }, 'normal');
	}

	updatePassword(id: number, passwordHash: string): Promise<AdminUserDoc | null> {
		return this.updateById(id, { password: passwordHash }, 'small');
	}

	updateAdmin(id: number, { name, email, role, status }: UpdateAdminInput): Promise<AdminUserDoc | null> {
		const set: Record<string, unknown> = {};
		if (name !== undefined) set.name = name;
		if (email !== undefined) set.email = email;
		if (role !== undefined) set.role = role;
		if (status !== undefined) set.status = status;
		return this.updateById(id, set, 'normal');
	}
}

const dbAdminUser = new AdminUserOperator();
export default dbAdminUser;

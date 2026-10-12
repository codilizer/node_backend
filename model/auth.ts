/**
 * Auth Model (회원 가입 / 로그인 / 비밀번호)
 */
import G from '#config/global';
import * as authUtil from '#lib/auth';
import cache from '#lib/cache';
import { logger } from '#lib/logger';
import { CustomError } from '#lib/error';
import { BaseModel } from '#model/base';
import dbUser from '#model/db/user';
import dbLogin from '#model/db/login';
import dbTemporaryPasswordReset from '#model/db/temporary_password_reset';
import mailModel from '#model/mail';
import type { DeviceType, Gender, SafeUser, UserDoc } from '#lib/types';

/** 로그인 컨텍스트 (디바이스, IP 등) */
export interface LoginContext {
	device?: DeviceType;
	appVersion?: string;
	pushToken?: string;
	ip?: string;
	userAgent?: string;
}

export interface RegisterInput {
	loginId: string;
	password: string;
	name: string;
	email?: string;
	gender?: Gender;
	birthday?: Date;
}

export interface LoginResult {
	user: SafeUser;
	accessToken: string;
	accessTokenExpire: Date;
}

/**
 * 응답용 사용자 객체에서 auth 정보를 제거한다.
 */
export function sanitizeUser(user: UserDoc): SafeUser;
export function sanitizeUser(user: UserDoc | null): SafeUser | null;
export function sanitizeUser(user: UserDoc | null): SafeUser | null {
	if (!user) return null;
	const { auth: _auth, ...rest } = user;
	return rest;
}

class AuthModel extends BaseModel {
	sanitize = sanitizeUser;

	/**
	 * 회원 가입. 가입 직후 바로 로그인 상태(액세스 토큰 발급)로 만든다.
	 */
	async register({ loginId, password, name, email, gender, birthday }: RegisterInput, context: LoginContext = {}): Promise<LoginResult> {
		const existsLoginId = await dbUser.getByLoginId(loginId, ['_id']);
		if (existsLoginId) throw new CustomError(G.err.conflict, 'loginId duplicated', { message: G.message.err.duplicatedLoginId });

		if (email) {
			const existsEmail = await dbUser.getByEmail(email, ['_id']);
			if (existsEmail) throw new CustomError(G.err.conflict, 'email duplicated', { message: G.message.err.duplicatedEmail });
		}

		const user = await dbUser.insertUser({
			loginId,
			passwordHash: authUtil.hashPassword(password),
			name,
			email,
			gender,
			birthday,
			device: { type: context.device || 'other' },
		});

		const result = await this.issueLogin(user._id, context);

		if (email) {
			// 메일 실패는 가입 자체를 막지 않는다.
			mailModel.sendWelcome(email, { name, loginId }).catch((err) => logger.error(`welcome mail failed: ${err}`));
		}

		return result;
	}

	/**
	 * 로그인 ID + 비밀번호 로그인
	 */
	async login(loginId: string, password: string, context: LoginContext = {}): Promise<LoginResult> {
		// 로그인 시도 제한
		const failCount = await cache.getLoginFailCount(loginId);
		if (failCount >= G.loginLock.maxFailCount) {
			throw new CustomError(G.err.toomany, 'login locked', { message: G.message.err.loginLocked });
		}

		const user = await dbUser.getByLoginIdForAuth(loginId);
		if (!user || !authUtil.verifyPassword(password, user.auth?.password)) {
			await cache.incrementLoginFail(loginId);
			throw new CustomError(G.err.badrequest, 'login failed', { message: G.message.err.loginFailed });
		}
		if (user.deleteFlag) throw new CustomError(G.err.forbidden, 'user is retired', { message: G.message.err.userRetired });
		if (user.status?.forbidden) {
			throw new CustomError(G.err.forbidden, 'user is forbidden', { message: G.message.err.userForbidden });
		}

		await cache.removeLoginFail(loginId);
		return this.issueLogin(user._id, context);
	}

	/**
	 * 액세스 토큰 발급 + 로그인 이력 저장
	 */
	async issueLogin(userId: number, context: LoginContext = {}): Promise<LoginResult> {
		const accessToken = authUtil.generateAccessToken();
		const accessTokenExpire = authUtil.getAccessTokenExpire();

		const user = await dbUser.updateLogin(userId, {
			accessToken,
			accessTokenExpire,
			device: { type: context.device, appVersion: context.appVersion, pushToken: context.pushToken },
		});
		if (!user) throw new CustomError(G.err.notfound, 'user not found');

		await dbLogin.insertLogin(userId, { device: context.device || 'other', ip: context.ip, userAgent: context.userAgent });
		await cache.removeForceLogout(userId);

		return { user: sanitizeUser(user), accessToken, accessTokenExpire };
	}

	/**
	 * 로그아웃 (토큰 폐기)
	 */
	logout(userId: number) {
		return dbUser.clearAccessToken(userId);
	}

	/**
	 * 비밀번호 변경 (현재 비밀번호 확인)
	 */
	async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
		const user = await dbUser.getById(userId, ['_id', 'loginId', 'auth']);
		if (!user) throw new CustomError(G.err.notfound, 'user not found');
		if (!authUtil.verifyPassword(currentPassword, user.auth?.password)) {
			throw new CustomError(G.err.badrequest, 'password mismatch', { message: G.message.err.passwordMismatch });
		}
		await dbUser.updatePassword(userId, authUtil.hashPassword(newPassword));
		return true;
	}

	/**
	 * 비밀번호 재설정 요청 (이메일로 링크 발송)
	 * 존재하지 않는 이메일이어도 성공으로 응답해 계정 존재 여부를 노출하지 않는다.
	 */
	async requestPasswordReset(email: string): Promise<boolean> {
		const user = await dbUser.getByEmail(email, ['_id', 'name', 'email', 'status']);
		if (!user || user.status?.forbidden) return false;

		const token = authUtil.generateResetToken();
		const expire = new Date(Date.now() + G.config.auth.passwordResetExpireMinutes * 60 * 1000);
		await dbTemporaryPasswordReset.insertToken(user._id, token, expire);
		await mailModel.sendPasswordReset(user.email!, { name: user.name, token });
		return true;
	}

	/**
	 * 재설정 토큰으로 비밀번호 변경
	 */
	async resetPasswordByToken(token: string, newPassword: string): Promise<boolean> {
		const reset = await dbTemporaryPasswordReset.getValidByToken(token);
		if (!reset) throw new CustomError(G.err.badrequest, 'reset token invalid', { message: G.message.err.resetTokenInvalid });

		await dbUser.updatePassword(reset.user, authUtil.hashPassword(newPassword));
		await dbTemporaryPasswordReset.markUsed(reset._id);
		return true;
	}

	/**
	 * 관리자용: 임시 비밀번호 발급 후 메일 발송. 임시 비밀번호를 돌려준다.
	 */
	async issueTemporaryPassword(userId: number): Promise<{ temporaryPassword: string; mailed: boolean }> {
		const user = await dbUser.getById(userId, ['_id', 'loginId', 'name', 'email', 'deleteFlag']);
		if (!user || user.deleteFlag) throw new CustomError(G.err.notfound, 'user not found');

		const temporaryPassword = authUtil.createTemporaryPassword();
		await dbUser.updatePassword(userId, authUtil.hashPassword(temporaryPassword));

		let mailed = false;
		if (user.email) {
			await mailModel.sendTemporaryPassword(user.email, { name: user.name, temporaryPassword });
			mailed = true;
		}
		return { temporaryPassword, mailed };
	}
}

const authModel = new AuthModel();
export default authModel;

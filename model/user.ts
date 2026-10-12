/**
 * User Model
 */
import G from '#config/global';
import cache from '#lib/cache';
import { CustomError } from '#lib/error';
import { BaseModel } from '#model/base';
import dbUser, { type UserSearchOptions, type UserSearchType } from '#model/db/user';
import dbLogin from '#model/db/login';
import type { DeviceType, Gender, LoginDoc, PagedResult, PaginateParams, UserDoc } from '#lib/types';

export interface ProfileInput {
	name?: string;
	gender?: Gender;
	birthday?: Date;
	description?: string;
}

class UserModel extends BaseModel {
	enums = dbUser.enums;

	/** 수정 가능한 프로필 필드 */
	readonly PROFILE_FIELDS: (keyof ProfileInput)[] = ['name', 'gender', 'birthday', 'description'];

	getById(userId: number, params: { fields?: string } = {}): Promise<UserDoc | null> {
		return dbUser.getById(userId, params.fields || 'normal');
	}

	getByAccessToken(accessToken: string): Promise<UserDoc | null> {
		return dbUser.getByAccessToken(accessToken);
	}

	clearAccessToken(userId: number) {
		return dbUser.clearAccessToken(userId);
	}

	/**
	 * 프로필 수정. 허용되지 않은 필드는 무시한다.
	 */
	async updateProfile(userId: number, profile: ProfileInput): Promise<UserDoc> {
		const update: Record<string, unknown> = {};
		for (const key of this.PROFILE_FIELDS) {
			if (profile[key] !== undefined) update[key] = profile[key];
		}
		if (Object.keys(update).length === 0) throw new CustomError(G.err.badrequest, 'nothing to update');

		const user = await dbUser.updateProfile(userId, update);
		if (!user) throw new CustomError(G.err.notfound, 'user not found');
		return user;
	}

	/**
	 * 프로필 이미지 URL 갱신
	 */
	updatePicture(userId: number, pictureUrl: string) {
		return dbUser.updateProfile(userId, { 'picture.main': pictureUrl });
	}

	/**
	 * 푸시 토큰 / 디바이스 정보 갱신
	 */
	updateDevice(userId: number, { type, pushToken, appVersion }: { type?: DeviceType; pushToken?: string; appVersion?: string }) {
		const update: Record<string, unknown> = {};
		if (type) update['device.type'] = type;
		if (pushToken !== undefined) update['device.pushToken'] = pushToken;
		if (appVersion !== undefined) update['device.appVersion'] = appVersion;
		return dbUser.updateProfile(userId, update);
	}

	/**
	 * 탈퇴
	 */
	async retire(userId: number): Promise<UserDoc> {
		const user = await dbUser.retire(userId);
		if (!user) throw new CustomError(G.err.notfound, 'user not found');
		await cache.setForceLogout(userId);
		return user;
	}

	/**
	 * 관리자: 이용 정지
	 */
	async forbid(userId: number, reason: string): Promise<UserDoc> {
		const user = await dbUser.updateForbidden(userId, true, reason);
		if (!user) throw new CustomError(G.err.notfound, 'user not found');
		await cache.setForceLogout(userId);
		return user;
	}

	/**
	 * 관리자: 이용 정지 해제
	 */
	async recover(userId: number): Promise<UserDoc> {
		const user = await dbUser.updateForbidden(userId, false);
		if (!user) throw new CustomError(G.err.notfound, 'user not found');
		await cache.removeForceLogout(userId);
		return user;
	}

	/**
	 * 관리자: 강제 로그아웃
	 */
	async forceLogout(userId: number): Promise<boolean> {
		await dbUser.clearAccessToken(userId);
		await cache.setForceLogout(userId);
		return true;
	}

	/**
	 * 관리자: 메모 수정
	 */
	updateMemo(userId: number, memo: string) {
		return dbUser.updateById(userId, { memo }, 'large');
	}

	/**
	 * 관리자: 검색
	 */
	search(type: UserSearchType, keyword: string, params: { fields?: string; paginate: PaginateParams }, options?: UserSearchOptions): Promise<PagedResult<UserDoc>> {
		return dbUser.search(type, keyword, params, options);
	}

	/**
	 * 로그인 이력
	 */
	getLoginHistory(userId: number, params: { fields?: string; paginate: PaginateParams }): Promise<PagedResult<LoginDoc>> {
		return dbLogin.getDataByUserId(userId, params);
	}
}

const userModel = new UserModel();
export default userModel;

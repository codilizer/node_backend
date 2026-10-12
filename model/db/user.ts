/**
 * User Collection Operator
 */
import { BaseOperator, type Condition } from '#model/db/base';
import type { DeviceType, Gender, PagedResult, PaginateParams, UserDoc } from '#lib/types';

export interface InsertUserInput {
	loginId: string;
	passwordHash: string;
	name: string;
	email?: string;
	gender?: Gender;
	birthday?: Date;
	device?: { type?: DeviceType };
}

export interface LoginUpdateInput {
	accessToken: string;
	accessTokenExpire: Date;
	device?: { type?: DeviceType; appVersion?: string; pushToken?: string };
}

export type UserSearchType = 'all' | 'loginId' | 'name' | 'email' | 'userId';

export interface UserSearchOptions {
	includeRetired?: boolean;
	forbiddenOnly?: boolean;
}

class UserOperator extends BaseOperator<UserDoc> {
	constructor() {
		super('user');
	}

	/**
	 * 회원 생성. passwordHash 는 lib/auth hashPassword 결과.
	 */
	insertUser({ loginId, passwordHash, name, email, gender, birthday, device }: InsertUserInput): Promise<UserDoc> {
		return this.insert({
			loginId,
			email,
			auth: { password: passwordHash, passwordUpdatedAt: new Date() },
			type: 'normal',
			name,
			gender,
			birthday,
			device,
		});
	}

	/**
	 * 로그인 ID 로 조회 (인증용. auth 필드 포함, 탈퇴 포함)
	 */
	getByLoginIdForAuth(loginId: string): Promise<UserDoc | null> {
		return this.findOne({ loginId }, [...this.fields.normal, 'auth']);
	}

	getByLoginId(loginId: string, fields?: string | string[]): Promise<UserDoc | null> {
		return this.findOne({ loginId }, fields);
	}

	getByEmail(email: string, fields?: string | string[]): Promise<UserDoc | null> {
		return this.findOne({ email, deleteFlag: false }, fields);
	}

	/**
	 * 액세스 토큰으로 조회 (preroute 인증용)
	 */
	async getByAccessToken(accessToken: string): Promise<UserDoc | null> {
		try {
			return (await this.model
				.findOne({ 'auth.accessToken': accessToken })
				.select([...this.fields.normal, 'auth.accessTokenExpire'].join(' '))
				.lean()) as UserDoc | null;
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * 로그인 성공 처리: 토큰 발급 + 마지막 로그인 갱신
	 */
	updateLogin(userId: number, { accessToken, accessTokenExpire, device }: LoginUpdateInput): Promise<UserDoc | null> {
		const set: Record<string, unknown> = {
			'auth.accessToken': accessToken,
			'auth.accessTokenExpire': accessTokenExpire,
			'status.lastLoginAt': new Date(),
		};
		if (device?.type) set['device.type'] = device.type;
		if (device?.appVersion) set['device.appVersion'] = device.appVersion;
		if (device?.pushToken) set['device.pushToken'] = device.pushToken;
		return this.updateById(userId, { $set: set, $inc: { 'status.loginCount': 1 } }, 'normal');
	}

	/**
	 * 토큰 제거 (로그아웃 / 강제 로그아웃)
	 */
	clearAccessToken(userId: number): Promise<UserDoc | null> {
		return this.updateById(userId, { $unset: { 'auth.accessToken': '', 'auth.accessTokenExpire': '' } }, 'tiny');
	}

	updatePassword(userId: number, passwordHash: string): Promise<UserDoc | null> {
		return this.updateById(
			userId,
			{
				$set: { 'auth.password': passwordHash, 'auth.passwordUpdatedAt': new Date() },
				$unset: { 'auth.accessToken': '', 'auth.accessTokenExpire': '' },
			},
			'tiny'
		);
	}

	/**
	 * 프로필 수정. 허용 필드만 넘겨야 한다.
	 */
	updateProfile(userId: number, profile: Record<string, unknown>): Promise<UserDoc | null> {
		return this.updateById(userId, profile, 'normal');
	}

	/**
	 * 이용 정지 / 해제
	 */
	updateForbidden(userId: number, forbidden: boolean, reason?: string): Promise<UserDoc | null> {
		const update = forbidden
			? {
					$set: { 'status.forbidden': true, 'status.forbiddenReason': reason || '', 'status.forbiddenAt': new Date() },
					$unset: { 'auth.accessToken': '', 'auth.accessTokenExpire': '' },
				}
			: { $set: { 'status.forbidden': false }, $unset: { 'status.forbiddenReason': '', 'status.forbiddenAt': '' } };
		return this.updateById(userId, update, 'normal');
	}

	/**
	 * 탈퇴 (soft delete). 개인정보 일부를 비우고 토큰을 제거한다.
	 */
	retire(userId: number): Promise<UserDoc | null> {
		return this.updateById(
			userId,
			{
				$set: { deleteFlag: true, deletedAt: new Date() },
				$unset: { 'auth.accessToken': '', 'auth.accessTokenExpire': '', 'device.pushToken': '', email: '' },
			},
			'normal'
		);
	}

	/**
	 * 관리자 검색. type: loginId | name | email | userId | all
	 */
	search(type: UserSearchType, keyword: string, params: { fields?: string; paginate: PaginateParams }, options: UserSearchOptions = {}): Promise<PagedResult<UserDoc>> {
		const condition: Condition = {};
		if (!options.includeRetired) condition.deleteFlag = false;
		if (options.forbiddenOnly) condition['status.forbidden'] = true;

		const escaped = keyword ? keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
		switch (type) {
			case 'userId':
				if (keyword) condition._id = parseInt(keyword, 10);
				break;
			case 'loginId':
				if (keyword) condition.loginId = new RegExp(escaped, 'i');
				break;
			case 'name':
				if (keyword) condition.name = new RegExp(escaped, 'i');
				break;
			case 'email':
				if (keyword) condition.email = new RegExp(escaped, 'i');
				break;
			case 'all':
			default:
				if (keyword) {
					const or: Condition[] = [{ loginId: new RegExp(escaped, 'i') }, { name: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }];
					if (/^[0-9]+$/.test(keyword)) or.push({ _id: parseInt(keyword, 10) });
					condition.$or = or;
				}
				break;
		}
		return this.getAll(params, condition);
	}

	/**
	 * 기간 내 가입자 수
	 */
	countCreatedBetween(start: Date, end: Date): Promise<number> {
		return this.count({ created: { $gte: start, $lt: end } });
	}
}

const dbUser = new UserOperator();
export default dbUser;

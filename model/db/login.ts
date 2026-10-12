/**
 * Login Collection Operator (로그인 이력)
 */
import { BaseOperator } from '#model/db/base';
import type { DeviceType, LoginDoc, PagedResult, PaginateParams } from '#lib/types';

class LoginOperator extends BaseOperator<LoginDoc> {
	constructor() {
		super('login');
	}

	/**
	 * 로그인 이력 저장
	 */
	insertLogin(userId: number, { device, ip, userAgent }: { device?: DeviceType; ip?: string; userAgent?: string }): Promise<LoginDoc> {
		return this.insert({ user: userId, device, ip, userAgent, created: new Date() });
	}

	/**
	 * 사용자의 로그인 이력 (최신순, 페이징)
	 */
	getDataByUserId(userId: number, params: { fields?: string; paginate: PaginateParams }): Promise<PagedResult<LoginDoc>> {
		return this.getAll({ ...params, paginate: { ...params.paginate, sort: '-created' } }, { user: userId });
	}

	async getLastLogin(userId: number): Promise<LoginDoc | null> {
		try {
			return (await this.model.findOne({ user: userId }).sort('-created').lean()) as LoginDoc | null;
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * 기간 내 로그인 수 / 로그인한 사용자 수
	 */
	countBetween(start: Date, end: Date): Promise<number> {
		return this.count({ created: { $gte: start, $lt: end } });
	}

	async countDistinctUsersBetween(start: Date, end: Date): Promise<number> {
		try {
			const users = await this.model.distinct('user', { created: { $gte: start, $lt: end } });
			return users.length;
		} catch (err) {
			throw this.wrapError(err);
		}
	}
}

const dbLogin = new LoginOperator();
export default dbLogin;

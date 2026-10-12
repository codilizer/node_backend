/**
 * TemporaryPasswordReset Collection Operator (비밀번호 재설정 토큰)
 */
import { BaseOperator } from '#model/db/base';
import type { PasswordResetDoc } from '#lib/types';

class TemporaryPasswordResetOperator extends BaseOperator<PasswordResetDoc> {
	constructor() {
		super('temporary_password_reset');
	}

	insertToken(userId: number, token: string, expire: Date): Promise<PasswordResetDoc> {
		return this.insert({ user: userId, token, expire, used: false });
	}

	/**
	 * 유효한(미사용, 만료 전) 토큰 조회
	 */
	getValidByToken(token: string): Promise<PasswordResetDoc | null> {
		return this.findOne({ token, used: false, expire: { $gt: new Date() } }, 'full');
	}

	markUsed(id: number): Promise<PasswordResetDoc | null> {
		return this.updateById(id, { used: true }, 'full');
	}
}

const dbTemporaryPasswordReset = new TemporaryPasswordResetOperator();
export default dbTemporaryPasswordReset;

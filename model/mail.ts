/**
 * Mail Model
 * 실제 발송 템플릿 조합을 담당한다. (lib/mail 은 전송만 담당)
 */
import G from '#config/global';
import mail from '#lib/mail';
import { BaseModel } from '#model/base';

class MailModel extends BaseModel {
	/**
	 * 비밀번호 재설정 링크 메일
	 */
	sendPasswordReset(to: string, { name, token }: { name?: string; token: string }) {
		const url = `${G.config.url.base}/password/reset?token=${encodeURIComponent(token)}`;
		return mail
			.create('password_reset', to)
			.prepare({
				name: name || to,
				url,
				expireMinutes: G.config.auth.passwordResetExpireMinutes,
				support: G.config.mail.support,
			})
			.send(G.message.mail.passwordResetTitle);
	}

	/**
	 * 관리자가 초기화한 임시 비밀번호 메일
	 */
	sendTemporaryPassword(to: string, { name, temporaryPassword }: { name?: string; temporaryPassword: string }) {
		return mail
			.create('temporary_password', to)
			.prepare({
				name: name || to,
				temporaryPassword,
				support: G.config.mail.support,
			})
			.send(G.message.mail.temporaryPasswordTitle);
	}

	/**
	 * 가입 환영 메일
	 */
	sendWelcome(to: string, { name, loginId }: { name?: string; loginId: string }) {
		return mail
			.create('welcome', to)
			.prepare({ name: name || loginId, loginId, support: G.config.mail.support })
			.send(G.message.mail.welcomeTitle);
	}
}

const mailModel = new MailModel();
export default mailModel;

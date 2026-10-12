/**
 * Mail library (nodemailer)
 *
 *  - config/mail_template/*.html 을 읽어 ${placeholder} 를 치환해 보낸다.
 *  - 템플릿의 <title> 이 메일 제목으로 쓰인다. (send 시 제목을 직접 넘기면 그 값이 우선)
 *  - mail.enable 이 false 면 실제로 보내지 않고 로그만 남긴다.
 *
 * 사용:
 *   import mail from '#lib/mail';
 *   mail.init();
 *   await mail.create('password_reset', to).prepare({ name, url }).send();
 */
import fs from 'node:fs';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import G from '#config/global';
import { logger } from '#lib/logger';
import { CustomError } from '#lib/error';

const DEFAULT_TITLE = 'Notification';

interface MailTemplateData {
	title: string;
	body: string;
}

export interface SendOptions {
	to: string;
	subject: string;
	text?: string;
	html?: string;
	attachments?: { filename: string; content?: string | Buffer; path?: string }[];
}

class Template {
	private mailLib: MailLibrary;
	private to: string;
	private mail: MailTemplateData;

	constructor(mailLib: MailLibrary, to: string, mail: MailTemplateData) {
		this.mailLib = mailLib;
		this.to = to;
		this.mail = mail;
	}

	/**
	 * ${key} 플레이스홀더 치환
	 */
	prepare(placeholders: Record<string, string | number> = {}): this {
		let { title, body } = this.mail;
		for (const [key, val] of Object.entries(placeholders)) {
			title = title.split('${' + key + '}').join(String(val));
			body = body.split('${' + key + '}').join(String(val));
		}
		this.mail = { title, body };
		return this;
	}

	send(subject?: string, attachments?: SendOptions['attachments']) {
		return this.mailLib.send({
			to: this.to,
			subject: subject || this.mail.title,
			html: this.mail.body,
			attachments,
		});
	}

	sendText(subject?: string) {
		return this.mailLib.send({
			to: this.to,
			subject: subject || this.mail.title,
			text: this.mail.body.replace(/<[^>]+>/g, ''),
		});
	}
}

class MailLibrary {
	private transport: Transporter | null = null;
	private templates: Record<string, MailTemplateData> = {};
	initialized = false;

	init(): this {
		const config = G.config.mail;

		if (config.enable) {
			this.transport = nodemailer.createTransport({
				host: config.smtp.host,
				port: config.smtp.port,
				secure: !!config.smtp.secure,
				auth: config.smtp.auth,
			});
			logger.info(`mail: smtp transport ${config.smtp.host}:${config.smtp.port}`);
		} else {
			this.transport = null;
			logger.info('mail: disabled, messages will be logged only');
		}

		// 템플릿 로드
		this.templates = {};
		const basePath = G.path.mail;
		for (const file of fs.readdirSync(basePath)) {
			if (!file.endsWith('.html') || file.startsWith('.')) continue;
			const name = file.replace('.html', '');
			const body = fs.readFileSync(path.join(basePath, file), 'utf8');
			const titleMatch = body.match(/<title>(.*?)<\/title>/);
			this.templates[name] = { title: titleMatch ? titleMatch[1] : DEFAULT_TITLE, body };
		}
		this.initialized = true;
		return this;
	}

	/**
	 * 템플릿 메일 객체 생성
	 */
	create(templateName: string, to: string): Template {
		const template = this.templates[templateName];
		if (!template) throw new CustomError(G.err.other, `mail template not loaded: ${templateName}`);
		return new Template(this, to, { ...template });
	}

	/**
	 * 템플릿 없이 바로 보내기
	 */
	async send({ to, subject, text, html, attachments }: SendOptions): Promise<unknown> {
		const message = { from: G.config.mail.from, to, subject, text, html, attachments };
		if (!this.transport) {
			logger.info(`mail(disabled) to=${to} subject=${subject}`);
			logger.debug(text || html);
			return { disabled: true };
		}
		try {
			const result = await this.transport.sendMail(message);
			logger.debug(`mail sent to=${to} subject=${subject}`);
			return result;
		} catch (err) {
			throw new CustomError(G.err.other, err as Error);
		}
	}

	/**
	 * 고객센터 주소로 보내기
	 */
	sendToSupport(subject: string, text: string) {
		return this.send({ to: G.config.mail.support, subject, text });
	}
}

const mail = new MailLibrary();
export default mail;

/**
 * API 서버 메시지 (한국어)
 * 클라이언트에 그대로 내려보내는 문구나 메일 제목 등을 모아둔다.
 */
import type { Messages } from '../types.ts';

const message: Messages = {
	err: {
		loginFailed: '아이디 또는 비밀번호가 올바르지 않습니다.',
		loginLocked: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
		userForbidden: '이용이 정지된 계정입니다.',
		userRetired: '탈퇴한 계정입니다.',
		duplicatedLoginId: '이미 사용 중인 아이디입니다.',
		duplicatedEmail: '이미 사용 중인 이메일입니다.',
		passwordMismatch: '현재 비밀번호가 올바르지 않습니다.',
		resetTokenInvalid: '비밀번호 재설정 링크가 만료되었거나 올바르지 않습니다.',
	},
	mail: {
		passwordResetTitle: '[서비스] 비밀번호 재설정 안내',
		temporaryPasswordTitle: '[서비스] 임시 비밀번호 안내',
		welcomeTitle: '[서비스] 회원 가입을 환영합니다',
	},
	push: {
		message: '새 메시지가 도착했습니다.',
	},
};

export default message;

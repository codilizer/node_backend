/**
 * 관리 서버 메시지 (한국어)
 */
import type { Messages } from '../../../app/lang/types.ts';

const message: Messages = {
	err: {
		loginFailed: '아이디와 비밀번호가 올바르지 않습니다.',
		noAuthority: '접근 권한이 없습니다.',
		adminOnly: '최고 관리자만 사용할 수 있는 기능입니다.',
		// API 서버 모델을 함께 사용하므로 동일한 키를 가진다
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
	admin: {
		deleteText: '삭제되었습니다',
		forbiddenDefaultReason: '운영 정책 위반',
	},
};

export default message;

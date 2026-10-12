/**
 * API server messages (English)
 */
import type { Messages } from '../types.ts';

const message: Messages = {
	err: {
		loginFailed: 'Invalid login id or password.',
		loginLocked: 'Too many login attempts. Please try again later.',
		userForbidden: 'This account has been suspended.',
		userRetired: 'This account has been withdrawn.',
		duplicatedLoginId: 'This login id is already in use.',
		duplicatedEmail: 'This email is already in use.',
		passwordMismatch: 'Current password is incorrect.',
		resetTokenInvalid: 'The password reset link is invalid or has expired.',
	},
	mail: {
		passwordResetTitle: '[Service] Password reset',
		temporaryPasswordTitle: '[Service] Your temporary password',
		welcomeTitle: '[Service] Welcome',
	},
	push: {
		message: 'You have a new message.',
	},
};

export default message;

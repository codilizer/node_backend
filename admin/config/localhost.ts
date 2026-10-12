/**
 * 로컬 개발 환경 설정 (관리 서버)
 */
import { deepMerge, NEED_TO_SPECIFY } from '#config/util';
import base from './_base.ts';

export default deepMerge(base, {
	env: 'localhost',
	skipAuth: false,
	session: {
		key: base.session.key === NEED_TO_SPECIFY ? 'local-dev-admin-session-secret' : base.session.key,
	},
	encrypt: {
		key: base.encrypt.key === NEED_TO_SPECIFY ? 'local-dev-encrypt-key-32bytes!!!' : base.encrypt.key,
	},
});

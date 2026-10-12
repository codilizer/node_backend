/**
 * 로컬 개발 환경 설정
 */
import { deepMerge, NEED_TO_SPECIFY } from '#config/util';
import base from './_base.ts';

export default deepMerge(base, {
	env: 'localhost',
	session: {
		key: base.session.key === NEED_TO_SPECIFY ? 'local-dev-session-secret' : base.session.key,
	},
	encrypt: {
		key: base.encrypt.key === NEED_TO_SPECIFY ? 'local-dev-encrypt-key-32bytes!!!' : base.encrypt.key,
	},
});

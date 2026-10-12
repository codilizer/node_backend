/**
 * 비밀번호 해시 생성 도구
 *
 *   npm run hash-password -- 'MySecret123!'
 *
 * 출력된 해시를 .env 의 ADMIN_BOOTSTRAP_PASSWORD_HASH 에 넣으면 비상용 관리자 계정으로 사용할 수 있다.
 */
import { hashPassword, verifyPassword } from '#lib/auth';

const password = process.argv[2];
if (!password) {
	console.error('usage: npm run hash-password -- <password>');
	process.exit(1);
}

const hash = hashPassword(password);
if (!verifyPassword(password, hash)) {
	console.error('hash verification failed');
	process.exit(1);
}
console.log(hash);

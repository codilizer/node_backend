/**
 * Authenticate library
 *
 *  - 비밀번호 해시 (scrypt, node 내장. 외부 native 모듈 불필요)
 *  - 액세스 토큰 / 로그인 ID / 임시 비밀번호 생성
 *  - 문자열 암복호화 (AES-256-GCM)
 */
import crypto from 'node:crypto';
import type { Context } from 'hono';
import G from '#config/global';

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

/**
 * 비밀번호를 해시한다. 결과 형식: scrypt$<salt hex>$<hash hex>
 */
export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16);
	const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
	return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * 비밀번호와 저장된 해시를 비교한다. 형식이 맞지 않으면 false.
 */
export function verifyPassword(password: string | undefined, stored: string | undefined): boolean {
	if (!password || !stored || typeof stored !== 'string') return false;
	const parts = stored.split('$');
	if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
	const salt = Buffer.from(parts[1], 'hex');
	const expected = Buffer.from(parts[2], 'hex');
	const actual = crypto.scryptSync(String(password), salt, expected.length, SCRYPT_OPTIONS);
	return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/**
 * 원본 프로젝트 호환: sha256 hex. (레거시 데이터 마이그레이션 용도로만 남겨둔다)
 */
export function encryptPasswordLegacy(password: string): string {
	return crypto.createHash('sha256').update(String(password)).digest('hex');
}

/**
 * 액세스 토큰 생성 (64자 hex)
 */
export function generateAccessToken(): string {
	return crypto.randomBytes(32).toString('hex');
}

/**
 * 액세스 토큰 만료 일시
 */
export function getAccessTokenExpire(): Date {
	const days = G.config.auth.tokenExpireDays || 30;
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * 비밀번호 재설정 토큰 (URL safe)
 */
export function generateResetToken(): string {
	return crypto.randomBytes(24).toString('base64url');
}

/**
 * 세션 ID
 */
export function generateSessionId(): string {
	return crypto.randomBytes(24).toString('base64url');
}

/**
 * 랜덤 영숫자 문자열. 로그인 ID 자동 발급이나 임시 비밀번호에 사용한다.
 */
export function createRandomString(length = 8): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
	let result = '';
	for (const byte of crypto.randomBytes(length)) {
		result += chars[byte % chars.length];
	}
	return result;
}

export function createAuthId(): string {
	return createRandomString(8);
}

export function createTemporaryPassword(): string {
	return createRandomString(G.digit.temporaryPassword || 10);
}

/**
 * 데이터 체크섬 (md5)
 */
export function calcCheckSum(data: string | Buffer): string {
	return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * 설정의 encrypt.key 로부터 32byte 키를 만든다.
 */
function deriveKey(): Buffer {
	return crypto.createHash('sha256').update(String(G.config.encrypt.key)).digest();
}

/**
 * 문자열 암호화 (AES-256-GCM). 결과: iv.tag.cipher (hex)
 */
export function encrypt(text: string): string {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
	const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`;
}

export function decrypt(payload: string): string {
	const [ivHex, tagHex, dataHex] = String(payload).split('.');
	const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(ivHex, 'hex'));
	decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
	const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
	return decrypted.toString('utf8');
}

/**
 * 요청에서 액세스 토큰을 꺼낸다. X-Access-Token 헤더 또는 Authorization: Bearer
 */
export function getAccessTokenFromRequest(c: Context): string | null {
	const headerName = G.config.auth.headerName || 'X-Access-Token';
	const fromHeader = c.req.header(headerName);
	if (fromHeader) return fromHeader.trim();

	const authorization = c.req.header('authorization');
	if (authorization && /^Bearer\s+/i.test(authorization)) {
		return authorization.replace(/^Bearer\s+/i, '').trim();
	}
	return null;
}

/**
 * 메시지 파일 타입. app/lang 과 admin/lang 이 같은 구조를 사용한다.
 */
export interface Messages {
	err: Record<string, string>;
	mail: Record<string, string>;
	admin?: Record<string, string>;
	[key: string]: unknown;
}

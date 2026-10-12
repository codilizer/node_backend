/**
 * Cache library (Redis)
 *
 * 설정 cache.enable 이 false 면 프로세스 메모리(Map)에 저장하는 폴백으로 동작한다.
 * 키 이름과 만료 시간은 doc/cache_key.ts 에서 관리한다.
 *
 * 사용:
 *   import cache from '#lib/cache';
 *   await cache.connect();
 *   await cache.set('FORCE_LOGOUT', { userId }, true);
 */
import G from '#config/global';
import { CustomError } from '#lib/error';
import { createKeyValueStore, type KeyValueStore } from '#lib/kv_store';
import CacheKey, { type CacheKeyType, type Placeholders } from '#doc/cache_key';

class CacheLibrary {
	private store: KeyValueStore | null = null;

	get isRedis(): boolean {
		return !!this.store?.isRedis;
	}

	private client(): KeyValueStore {
		if (!this.store) throw new CustomError(G.err.other, 'cache is not connected');
		return this.store;
	}

	async connect(): Promise<this> {
		const config = G.config.cache;
		this.store = await createKeyValueStore(!!config?.enable, config.redis, 'cache');
		return this;
	}

	async close(): Promise<void> {
		if (this.store) await this.store.close();
		this.store = null;
	}

	/**
	 * 키 타입과 placeholder 로 값을 가져온다. JSON 으로 저장되어 있다.
	 */
	async get<T = unknown>(keyType: CacheKeyType, placeholder?: Placeholders): Promise<T | null> {
		const setting = CacheKey.get(keyType, placeholder);
		try {
			const result = await this.client().get(setting.key);
			return result === null ? null : (JSON.parse(result) as T);
		} catch (err) {
			throw new CustomError(G.err.other, err as Error);
		}
	}

	/**
	 * 값을 JSON 으로 저장하고 키 타입에 정의된 만료 시간을 적용한다.
	 */
	async set<T>(keyType: CacheKeyType, placeholder: Placeholders | undefined, value: T): Promise<T> {
		const setting = CacheKey.get(keyType, placeholder);
		try {
			await this.client().set(setting.key, JSON.stringify(value), setting.expire);
			return value;
		} catch (err) {
			throw new CustomError(G.err.other, err as Error);
		}
	}

	async remove(keyType: CacheKeyType, placeholder?: Placeholders): Promise<void> {
		const setting = CacheKey.get(keyType, placeholder);
		try {
			await this.client().del(setting.key);
		} catch (err) {
			throw new CustomError(G.err.other, err as Error);
		}
	}

	/**
	 * 숫자 증가. 처음 생성될 때 만료 시간을 적용한다.
	 */
	async increment(keyType: CacheKeyType, placeholder?: Placeholders): Promise<number> {
		const setting = CacheKey.get(keyType, placeholder);
		try {
			const count = await this.client().incr(setting.key);
			if (count === 1 && setting.expire) await this.client().expire(setting.key, setting.expire);
			return count;
		} catch (err) {
			throw new CustomError(G.err.other, err as Error);
		}
	}

	async keys(keyType: CacheKeyType, placeholder?: Placeholders): Promise<string[]> {
		const setting = CacheKey.get(keyType, placeholder);
		try {
			return await this.client().keys(setting.key);
		} catch (err) {
			throw new CustomError(G.err.other, err as Error);
		}
	}

	// ---------- 업무용 helper ----------

	/** 강제 로그아웃 플래그 (관리자가 사용자를 정지/탈퇴시켰을 때) */
	setForceLogout(userId: number) {
		return this.set('FORCE_LOGOUT', { userId }, true);
	}
	getForceLogout(userId: number) {
		return this.get<boolean>('FORCE_LOGOUT', { userId });
	}
	removeForceLogout(userId: number) {
		return this.remove('FORCE_LOGOUT', { userId });
	}

	/** 로그인 실패 횟수 (brute force 방지) */
	incrementLoginFail(loginId: string) {
		return this.increment('LOGIN_FAIL_COUNT', { loginId });
	}
	async getLoginFailCount(loginId: string): Promise<number> {
		const count = await this.get<number | string>('LOGIN_FAIL_COUNT', { loginId });
		return parseInt(String(count ?? 0), 10) || 0;
	}
	removeLoginFail(loginId: string) {
		return this.remove('LOGIN_FAIL_COUNT', { loginId });
	}

	/** 관리 화면 카운터 캐시 */
	setAdminCounter<T>(type: string, count: T) {
		return this.set('ADMIN_COUNTER', { type }, count);
	}
	getAdminCounter<T>(type: string) {
		return this.get<T>('ADMIN_COUNTER', { type });
	}
}

const cache = new CacheLibrary();
export default cache;

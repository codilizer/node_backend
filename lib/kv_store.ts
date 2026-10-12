/**
 * Key-Value 저장소 추상화
 *
 * 캐시(lib/cache.ts)와 세션(lib/session.ts)이 공통으로 사용한다.
 *  - RedisStore : node-redis 클라이언트 래퍼
 *  - MemoryStore: Redis 가 없을 때의 프로세스 메모리 폴백 (만료 지원)
 */
import { createClient, type RedisClientType } from 'redis';
import type { RedisConfig } from '#config/types';
import { logger } from '#lib/logger';

export interface KeyValueStore {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ttlSeconds?: number): Promise<void>;
	del(key: string): Promise<void>;
	expire(key: string, ttlSeconds: number): Promise<void>;
	incr(key: string): Promise<number>;
	keys(pattern: string): Promise<string[]>;
	close(): Promise<void>;
	readonly isRedis: boolean;
}

interface MemoryItem {
	value: string;
	expireAt: number | null;
}

export class MemoryStore implements KeyValueStore {
	readonly isRedis = false;
	private map = new Map<string, MemoryItem>();

	private purge(key: string): MemoryItem | null {
		const item = this.map.get(key);
		if (!item) return null;
		if (item.expireAt && item.expireAt <= Date.now()) {
			this.map.delete(key);
			return null;
		}
		return item;
	}

	async get(key: string): Promise<string | null> {
		const item = this.purge(key);
		return item ? item.value : null;
	}

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
		this.map.set(key, { value, expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
	}

	async del(key: string): Promise<void> {
		this.map.delete(key);
	}

	async expire(key: string, ttlSeconds: number): Promise<void> {
		const item = this.purge(key);
		if (item) item.expireAt = Date.now() + ttlSeconds * 1000;
	}

	async incr(key: string): Promise<number> {
		const item = this.purge(key);
		const next = (item ? parseInt(item.value, 10) || 0 : 0) + 1;
		this.map.set(key, { value: String(next), expireAt: item ? item.expireAt : null });
		return next;
	}

	async keys(pattern: string): Promise<string[]> {
		const regexp = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
		const result: string[] = [];
		for (const key of this.map.keys()) {
			if (this.purge(key) && regexp.test(key)) result.push(key);
		}
		return result;
	}

	async close(): Promise<void> {
		this.map.clear();
	}
}

export class RedisStore implements KeyValueStore {
	readonly isRedis = true;
	private client: RedisClientType;

	constructor(client: RedisClientType) {
		this.client = client;
	}

	static async connect(config: RedisConfig, label: string): Promise<RedisStore> {
		const client = createClient({ url: config.url, database: config.database || 0 }) as RedisClientType;
		client.on('error', (err) => logger.error(`redis(${label}) error: ${err}`));
		await client.connect();
		logger.info(`redis(${label}) connected ${config.url} db=${config.database || 0}`);
		return new RedisStore(client);
	}

	async get(key: string): Promise<string | null> {
		return this.client.get(key);
	}

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
		if (ttlSeconds) {
			await this.client.set(key, value, { EX: ttlSeconds });
		} else {
			await this.client.set(key, value);
		}
	}

	async del(key: string): Promise<void> {
		await this.client.del(key);
	}

	async expire(key: string, ttlSeconds: number): Promise<void> {
		await this.client.expire(key, ttlSeconds);
	}

	async incr(key: string): Promise<number> {
		return this.client.incr(key);
	}

	async keys(pattern: string): Promise<string[]> {
		return this.client.keys(pattern);
	}

	async close(): Promise<void> {
		await this.client.quit();
	}
}

/**
 * 설정에 따라 Redis 또는 메모리 저장소를 만든다.
 */
export async function createKeyValueStore(enable: boolean, redisConfig: RedisConfig, label: string): Promise<KeyValueStore> {
	if (enable) return RedisStore.connect(redisConfig, label);
	logger.info(`${label}: redis disabled, using in-memory store`);
	return new MemoryStore();
}

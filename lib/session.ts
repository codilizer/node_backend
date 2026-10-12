/**
 * Session library (Hono 용)
 *
 * 서명된 쿠키(세션 ID) + 저장소(Redis 또는 메모리) 조합으로 동작한다.
 *   - 요청 시작: 쿠키의 세션 ID 로 저장소에서 데이터를 읽어 c.get('session') 에 넣는다.
 *   - 요청 종료: 변경이 있으면 저장소에 쓰고 쿠키를 갱신한다. destroy() 했으면 지운다.
 *
 * 사용:
 *   const session = c.get('session');
 *   session.regenerate();                 // 로그인 시 세션 고정 공격 방지
 *   session.set('loginId', 'admin');
 *   session.destroy();                    // 로그아웃
 */
import type { MiddlewareHandler } from 'hono';
import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie';
import G from '#config/global';
import { logger } from '#lib/logger';
import { generateSessionId } from '#lib/auth';
import { createKeyValueStore, type KeyValueStore } from '#lib/kv_store';
import type { AdminRole } from '#lib/types';

export interface SessionData {
	loginId?: string;
	authority?: AdminRole;
	adminUserId?: number;
	adminName?: string;
	createdAt?: number;
}

export class Session {
	id: string | null;
	data: SessionData;
	private dirty = false;
	private destroyed = false;
	private previousId: string | null = null;

	constructor(id: string | null, data: SessionData) {
		this.id = id;
		this.data = data;
	}

	get<K extends keyof SessionData>(key: K): SessionData[K] {
		return this.data[key];
	}

	set<K extends keyof SessionData>(key: K, value: SessionData[K]): void {
		this.data[key] = value;
		this.dirty = true;
	}

	/** 로그인 여부 */
	get isLoggedIn(): boolean {
		return !!this.data.loginId;
	}

	/**
	 * 세션 ID 를 새로 발급하고 기존 데이터를 비운다. (로그인 직전에 호출)
	 */
	regenerate(): void {
		this.previousId = this.id;
		this.id = generateSessionId();
		this.data = { createdAt: Date.now() };
		this.dirty = true;
		this.destroyed = false;
	}

	/**
	 * 세션 삭제 (로그아웃)
	 */
	destroy(): void {
		this.previousId = this.id;
		this.destroyed = true;
		this.dirty = true;
	}

	get needsCommit(): boolean {
		return this.dirty;
	}

	get isDestroyed(): boolean {
		return this.destroyed;
	}

	get idToDelete(): string | null {
		return this.previousId;
	}
}

class SessionLibrary {
	private store: KeyValueStore | null = null;

	private key(id: string): string {
		const prefix = G.config.session.redis?.prefix || 'sess:';
		return `${prefix}${id}`;
	}

	private get ttlSeconds(): number {
		return Math.floor(G.config.session.maxAge / 1000);
	}

	async connect(): Promise<this> {
		const config = G.config.session;
		const useRedis = !!G.config.cache?.enable;
		this.store = await createKeyValueStore(useRedis, config.redis, 'session');
		if (!useRedis && (G.env === 'production' || G.env === 'staging')) {
			logger.warn('session: in-memory store is used in a server environment. enable redis (REDIS_ENABLE=true).');
		}
		return this;
	}

	async close(): Promise<void> {
		if (this.store) await this.store.close();
		this.store = null;
	}

	/**
	 * Hono 미들웨어 생성
	 */
	middleware<E extends { Variables: { session: Session } }>(): MiddlewareHandler<E> {
		const config = G.config.session;
		const cookieName = config.name || 'sid';
		const secret = config.key;

		const handler: MiddlewareHandler<{ Variables: { session: Session } }> = async (c, next) => {
			if (!this.store) throw new Error('session store is not connected. call session.connect() first');
			const store = this.store;

			// 1) 쿠키에서 세션 ID 복원
			let id: string | null = null;
			let data: SessionData = {};
			const signed = await getSignedCookie(c, secret, cookieName);
			if (signed) {
				const raw = await store.get(this.key(signed));
				if (raw) {
					id = signed;
					try {
						data = JSON.parse(raw) as SessionData;
					} catch {
						data = {};
					}
				}
			}

			const session = new Session(id, data);
			c.set('session', session);

			await next();

			// 2) 변경 사항 반영
			if (!session.needsCommit) return;

			if (session.idToDelete) {
				await store.del(this.key(session.idToDelete));
			}

			if (session.isDestroyed) {
				deleteCookie(c, cookieName, { path: '/' });
				return;
			}

			if (!session.id) session.regenerate();
			await store.set(this.key(session.id!), JSON.stringify(session.data), this.ttlSeconds);
			await setSignedCookie(c, cookieName, session.id!, secret, {
				path: '/',
				httpOnly: true,
				secure: !!config.secure,
				sameSite: 'Lax',
				maxAge: this.ttlSeconds,
			});
		};
		return handler as unknown as MiddlewareHandler<E>;
	}
}

const session = new SessionLibrary();
export default session;

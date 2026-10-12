/**
 * 캐시 키 정의
 *
 * pattern 의 {name} 은 placeholder 로 치환된다.
 *   CacheKey.get('FORCE_LOGOUT', { userId: 1 }) → { key: 'force_logout_1', expire: 604800 }
 */
const settings = {
	FORCE_LOGOUT: {
		expire: 7 * 24 * 60 * 60,
		pattern: 'force_logout_{userId}',
	},
	LOGIN_FAIL_COUNT: {
		expire: 5 * 60,
		pattern: 'login_fail_{loginId}',
	},
	ADMIN_COUNTER: {
		expire: 10 * 60,
		pattern: 'admin_counter_{type}',
	},
	USER_SETTINGS: {
		expire: 24 * 60 * 60,
		pattern: '{userId}_settings',
	},
	APP_VERSION: {
		expire: 60,
		pattern: 'app_version_{type}',
	},
} as const;

export type CacheKeyType = keyof typeof settings;
export type Placeholders = Record<string, string | number>;

export interface CacheKeySetting {
	key: string;
	expire: number;
}

const CacheKey = {
	settings,

	/**
	 * placeholders = { userId: 1 }
	 */
	get(type: CacheKeyType, placeholders?: Placeholders): CacheKeySetting {
		const setting = settings[type];
		if (!setting) throw new Error(`unknown cache key type: ${String(type)}`);

		let replacedKey: string = setting.pattern;
		if (placeholders) {
			for (const [key, value] of Object.entries(placeholders)) {
				replacedKey = replacedKey.replace(`{${key}}`, String(value));
			}
		}
		return { key: replacedKey, expire: setting.expire };
	},

	enums: Object.fromEntries(Object.keys(settings).map((key) => [key, key])) as Record<CacheKeyType, CacheKeyType>,
};

export default CacheKey;

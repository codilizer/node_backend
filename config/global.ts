/**
 * Global variables
 *
 * 서버 종류(kind: 'app' | 'admin' | 'batch')에 따라 경로, 설정, 메시지, 에러 정의를 한 곳에 모아둔다.
 * 사용 방법:
 *   import G from '#config/global';
 *   await G.create('app');       // 서버 기동 시 1회
 *   G.config.server.port ...     // 이후 어디서나 접근
 *
 * 원본 프로젝트는 node 의 global 객체 자체를 덮어썼지만, 여기서는 모듈 싱글턴으로 관리한다.
 */
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findUnspecified } from './util.ts';
import type { AnyConfig, AdminConfig, EnvName, ServerKind } from './types.ts';
import type { Messages } from '../app/lang/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENV_LIST: EnvName[] = ['localhost', 'development', 'staging', 'production', 'test'];

export interface ErrorKind {
	code: 400 | 401 | 403 | 404 | 406 | 409 | 410 | 429 | 500;
	msg: string;
}

/**
 * .env 파일 로드 (Node 20.12+ 내장 기능)
 * 파일이 없으면 조용히 넘어간다. ENV_FILE 환경 변수로 경로를 바꿀 수 있다.
 */
function loadEnvFile(): void {
	const envFile = process.env.ENV_FILE || path.join(ROOT, '.env');
	try {
		process.loadEnvFile(envFile);
	} catch {
		// .env 가 없는 환경(EC2 에서 환경 변수를 직접 주입하는 경우 등)은 정상
	}
}

/**
 * 실행 환경 결정 우선순위: --env 인자 > NODE_ENV > localhost
 * 원본에서 사용하던 'product' 는 'production' 으로 매핑한다.
 */
function resolveEnv(): EnvName {
	let envName: string | undefined;
	try {
		const { values } = parseArgs({ options: { env: { type: 'string' } }, strict: false });
		envName = values.env as string | undefined;
	} catch {
		envName = undefined;
	}
	envName = envName || process.env.NODE_ENV || 'localhost';
	if (envName === 'product') envName = 'production';
	if (!(ENV_LIST as string[]).includes(envName)) {
		throw new Error(`unknown env: ${envName} (allowed: ${ENV_LIST.join(', ')})`);
	}
	return envName as EnvName;
}

class GlobalVariable {
	isInitialized = false;
	kind: ServerKind = 'app';
	env: EnvName = 'localhost';

	/** 경로 모음 */
	path = {
		root: ROOT,
		routes: '',
		views: '',
		public: '',
		config: path.join(ROOT, 'config'),
		doc: path.join(ROOT, 'doc'),
		lib: path.join(ROOT, 'lib'),
		model: path.join(ROOT, 'model'),
		db: path.join(ROOT, 'model', 'db'),
		mail: path.join(ROOT, 'config', 'mail_template'),
		logs: path.join(ROOT, 'logs'),
		adminClientDist: path.join(ROOT, 'admin', 'public', 'dist'),
		image: {
			temp: path.join(ROOT, 'temp', 'upload'),
			profile: path.join(ROOT, 'app', 'public', 'img', 'profile'),
		},
	};

	/** 환경별 설정 (create() 이후 사용 가능) */
	config!: AnyConfig;

	/** 언어별 메시지 */
	message!: Messages;

	/** API 에러 정의. CustomError(kind, msg) 의 kind 로 사용한다. */
	err = {
		badrequest: { code: 400, msg: 'this request is bad request' },
		unauthorized: { code: 401, msg: 'this request is unauthorized' },
		forbidden: { code: 403, msg: 'this request is forbidden' },
		notfound: { code: 404, msg: 'this request is notfound' },
		notacceptable: { code: 406, msg: 'this request is not acceptable' },
		conflict: { code: 409, msg: 'this request is conflict' },
		gone: { code: 410, msg: 'this request is gone' },
		toomany: { code: 429, msg: 'too many requests' },
		other: { code: 500, msg: 'internal server error' },
	} as const satisfies Record<string, ErrorKind>;

	/** 자릿수/길이 규칙 */
	digit = {
		loginId: { min: 4, max: 20 }, // 로그인 ID 길이
		password: { min: 8, max: 64 }, // 비밀번호 길이
		name: { min: 1, max: 20 }, // 표시 이름 길이
		temporaryPassword: 10, // 비밀번호 리셋 시 발급하는 임시 비밀번호 길이
	};

	/** 페이징 기본값 */
	paginate = {
		defaultLimit: 10,
		maxLimit: 100,
	};

	/** 로그인 시도 제한 (캐시 사용 시 적용) */
	loginLock = {
		maxFailCount: 5, // 이 횟수 이상 실패하면
		lockSeconds: 300, // 이 시간(초) 동안 로그인 차단
	};

	/** 이미지 리사이즈 크기 (확장용) */
	imageSize = {
		profile: 500,
	};

	/**
	 * 설정 초기화. 서버/배치 기동 시 가장 먼저 1회 호출한다.
	 */
	async create(kind: ServerKind): Promise<this> {
		loadEnvFile();
		this.kind = kind;
		this.env = resolveEnv();

		// batch 는 admin 설정을 공유한다.
		const configKind = kind === 'batch' ? 'admin' : kind;
		this.path.routes = path.join(ROOT, configKind, 'routes');
		this.path.views = path.join(ROOT, configKind, 'views');
		this.path.public = path.join(ROOT, configKind, 'public');

		const configModule = await import(path.join(ROOT, configKind, 'config', `${this.env}.ts`));
		this.config = configModule.default as AnyConfig;

		const messageModule = await import(path.join(ROOT, configKind, 'lang', this.config.country, 'message.ts'));
		this.message = messageModule.default as Messages;

		this.isInitialized = true;
		return this;
	}

	/** 관리 서버 설정으로 접근할 때 사용 */
	get adminConfig(): AdminConfig {
		return this.config as AdminConfig;
	}

	/** '#need to specify' 가 남아 있는 설정 경로 목록 */
	listUnspecified(): string[] {
		return findUnspecified(this.config);
	}
}

const G = new GlobalVariable();
export default G;

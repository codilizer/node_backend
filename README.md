# node-backend

범용 API 서버 + 관리 페이지 보일러플레이트 실험 (Express 3 / Jade / Mongoose 3 / AngularJS) 프로젝트의 구조를 분석해, 그 레이어 구성과 규약은 유지하면서 최신 스택으로 다시 구축했다.

| 영역 | 스택 |
|---|---|
| 런타임 | Node.js 22 (TypeScript 파일을 빌드 없이 직접 실행) |
| API / 관리 서버 | [Hono](https://hono.dev) + `@hono/node-server` |
| 검증 | zod |
| DB | MongoDB (mongoose 8), MySQL (mysql2, 선택), Redis (선택) |
| 관리 페이지 | React 19 + TypeScript + Vite + react-router 7 + Bootstrap 5 |
| 로그 / 메일 | log4js, nodemailer |
| 테스트 | `node --test` + mongodb-memory-server |
| 운영 | pm2, AWS EC2 |

> 소스 안의 `#need to specify` 는 실제 운영 값으로 반드시 교체해야 하는 자리이다. 서버는 기동 시 이 값이 남아 있는 설정 경로를 경고(운영에서는 에러) 로그로 알려준다.

## 1. 디렉토리 구조

```
.
├── app/                      API 서버
│   ├── server.ts             기동 (cluster 지원)
│   ├── app.ts                Hono 앱 생성 (라우트 자동 등록)
│   ├── config/               환경별 설정 (_base.ts 위에 localhost/development/staging/production/test 덧씌움)
│   ├── lang/<country>/       메시지
│   ├── routes/api/v1/*.ts    API 라우트 (파일마다 register(app) export)
│   ├── routes/web/*.ts       HTML 페이지 라우트 (안내 페이지, 비밀번호 재설정)
│   ├── views/*.ts            hono/html 기반 서버 렌더 뷰
│   └── public/               정적 파일 (css, img/profile 업로드)
├── admin/                    관리 서버
│   ├── server.ts / app.ts
│   ├── config/, lang/
│   ├── routes/preroute.ts    세션 인증 미들웨어, requireRole()
│   ├── routes/api/*.ts       관리 API (/api/v1/admin/*)
│   ├── client/               React 관리 페이지 소스 (Vite)
│   └── public/dist/          React 빌드 결과 (git 제외, `npm run build:client`)
├── config/
│   ├── global.ts             G 싱글턴: 경로 / 설정 / 메시지 / 에러 정의 / 상수
│   ├── util.ts               env(), deepMerge(), findUnspecified()
│   ├── types.ts              설정 타입
│   └── mail_template/*.html  메일 템플릿 (${placeholder})
├── lib/                      공통 라이브러리
│   ├── logger.ts             log4js (action / query / access / critical)
│   ├── error.ts              CustomError, notFoundHandler, errorHandler
│   ├── response.ts           { meta, paginate, data } 응답 포맷
│   ├── validate.ts           zod 공통 필드 + parseJson/parseQuery/parseParams
│   ├── auth.ts               scrypt 비밀번호 해시, 토큰 생성, AES-GCM 암복호화
│   ├── preroute.ts           API 액세스 토큰 인증 미들웨어
│   ├── session.ts            관리 서버 세션 (서명 쿠키 + Redis/메모리)
│   ├── database.ts           mongoose 연결, 컬렉션 등록, 시퀀스 채번, paginate
│   ├── mysql.ts              mysql2 풀 (선택)
│   ├── cache.ts / kv_store.ts Redis 캐시 (없으면 메모리 폴백)
│   ├── mail.ts               nodemailer + 템플릿
│   └── upload.ts             파일 업로드 저장
├── model/                    비즈니스 모델 (auth, user, admin, information, version, mail)
│   └── db/                   컬렉션 오퍼레이터 (BaseOperator 상속, CRUD)
├── doc/
│   ├── main.ts               MongoDB 스키마 정의 (컬렉션별 schema / fields / enums / indexes)
│   ├── cache_key.ts          캐시 키 패턴과 만료 시간
│   └── mysql/schema.sql      MySQL 스키마 예시
├── batch/                    배치 (base.ts + data/*.ts)
├── scripts/                  hash_password.ts, deploy.sh, ec2_setup.sh
├── test/                     통합 테스트
├── ecosystem.config.cjs      pm2 설정
└── .env.example
```

### 원본 프로젝트와의 대응

| 원본 (teddy-node) | 이 프로젝트 |
|---|---|
| `global = require('../config/global').create('app')` | `import G from '#config/global'; await G.create('app')` |
| `app/config/<env>.js` 전체 복사본 | `_base.ts` + 환경별 덧씌우기 (`deepMerge`) |
| `lib/error.js` `CustomError(global.err.badrequest, msg)` | `new CustomError(G.err.badrequest, msg, body?)` 동일 |
| `lib/response.js` `response.success(res, data, paginate)` | `success(c, data, paginate)` 동일 포맷 |
| `lib/preroute.js` `X-Teddy-AccessToken` | `X-Access-Token` 또는 `Authorization: Bearer` |
| `doc/teddy.js` + `lib/database.js` (counter 채번, `Query.paginate`) | `doc/main.ts` + `lib/database.ts` (`paginateQuery`) |
| `model/db/base.js` / `model/base.js` | `BaseOperator` / `BaseModel` 클래스 |
| `routes/api/v1/*.js` `exports.register(app)` | 동일 (`export function register(app)`), 서버가 자동 로드 |
| 관리자 `config.accounts` sha256 | DB `admin_user` 컬렉션 + 비상 계정(`accounts`, scrypt) |
| `admin/views/*.jade` + AngularJS | React SPA (`admin/client`) |
| `process.yml` (pm2) | `ecosystem.config.cjs` |
| `batch/base.js` | `batch/base.ts` (`--dryRun=false` 로 실제 반영) |

## 2. 요구 사항

- Node.js **22.18 이상** (`.nvmrc` 참고. `nvm use`)
- MongoDB 6 이상
- (선택) Redis 6 이상, MySQL 8 이상

## 3. 시작하기

```bash
nvm use                      # Node 22
npm install
cp .env.example .env         # 값 채우기 (로컬은 MONGO_URI 만 있어도 동작)

# API 서버 (http://localhost:4000)
npm run dev

# 관리 서버 (http://localhost:3001) + React 개발 서버 (http://localhost:5173/admin)
npm run dev:admin
npm run dev:client

# 관리 페이지를 빌드해서 관리 서버가 직접 서빙하게 하려면
npm run build:client         # → admin/public/dist, 이후 http://localhost:3001/admin
```

### 관리자 계정 만들기

```bash
# DB 에 관리자 생성 (role: admin | operator)
npm run batch:admin-user -- --id=admin --password='Secret123!' --name='최고관리자' --role=admin --dryRun=false

# 또는 비상 계정: 해시를 만들어 .env 의 ADMIN_BOOTSTRAP_PASSWORD_HASH 에 넣는다.
#   DB 에 관리자가 한 명도 없을 때만 이 계정으로 로그인할 수 있다.
npm run hash-password -- 'Secret123!'
```

### 기본 데이터

```bash
npm run batch:master-data -- --dryRun=false   # 앱 버전 기본값 + 샘플 공지
```

### 테스트 / 타입 검사

```bash
npm test           # mongodb-memory-server 로 API 서버 15건 + 관리 서버 10건 통합 테스트
npm run typecheck  # 서버 + 클라이언트 tsc --noEmit
```

## 4. 설정

- 실행 환경: `NODE_ENV` 또는 `--env` (`localhost | development | staging | production | test`). 원본의 `product` 는 `production` 으로 매핑된다.
- 비밀 값은 모두 환경 변수로 받는다 (`.env` 또는 시스템 환경 변수, `.env.example` 참고). 코드에 직접 쓰지 않는다.
- Redis 가 없으면(`REDIS_ENABLE=false`) 캐시와 세션이 프로세스 메모리로 동작한다. 서버 환경(다중 인스턴스)에서는 반드시 Redis 를 켠다.
- MySQL 은 `MYSQL_ENABLE=true` 일 때만 풀을 만든다. `lib/mysql.ts` 의 `execQuery / execUpdate / transaction` 으로 사용한다.
- 관리 서버 `skipAuth: true` (localhost 설정에서만) 로 로그인 없이 admin 권한으로 개발할 수 있다.

## 5. API 개요 (`/api/v1`)

응답은 항상 아래 포맷이다. 실패 시 `meta.code` 가 HTTP 상태 코드와 같고, `data.message` 에 사용자 표시용 문구가 들어올 수 있다.

```json
{ "meta": { "code": 200, "message": "ok" }, "paginate": { "total": 1, "page": 1, "skip": 0, "limit": 10 }, "data": {} }
```

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/health` | - | 헬스체크 |
| GET | `/app/version?type=ios&version=1.0.0` | - | 최신/최소 버전, `needUpdate`, `forceUpdate` |
| POST | `/auth/register` | - | 가입 `{login_id, password, name, email?, gender?, birthday?}` → 토큰 발급 |
| POST | `/auth/login` | - | 로그인 `{login_id, password, device_type?, app_version?, push_token?}` |
| POST | `/auth/logout` | 토큰 | 토큰 폐기 |
| POST | `/auth/password/reset` | - | 재설정 메일 요청 `{email}` |
| POST | `/auth/password/reset/confirm` | - | `{token, password}` |
| GET / PUT / DELETE | `/me` | 토큰 | 내 정보 조회 / 수정 / 탈퇴 |
| PUT | `/me/password` | 토큰 | `{current_password, new_password}` (성공 후 재로그인 필요) |
| PUT | `/me/picture` | 토큰 | multipart `file` 업로드 |
| PUT | `/me/device` | 토큰 | 디바이스 / 푸시 토큰 |
| GET | `/me/login_history` | 토큰 | 로그인 이력 (페이징) |
| GET | `/user/:userId` | 토큰 | 공개 프로필 |
| GET | `/information`, `/information/:id` | - | 공지 |

인증 헤더: `X-Access-Token: <token>` 또는 `Authorization: Bearer <token>`. 페이징 쿼리: `?page=&limit=&skip=&sort=`.

### 관리 API (`/api/v1/admin`, 세션 쿠키)

`auth/login`, `auth/logout`, `me`, `me/password`, `dashboard/counts`, `users`(검색), `user/:id`(조회/수정/메모/정지/해제/강제 로그아웃/탈퇴/비밀번호 초기화/로그인 이력), `information`(CRUD), `admin_users`(CRUD, admin 권한), `versions`, `version/:type`.

권한은 `admin`(전체) / `operator`(조회·운영) 두 가지이며 `requireRole('admin')` 으로 라우트 단위 제한한다.

## 6. 새 기능 추가하는 순서

1. `doc/main.ts` 에 컬렉션 정의 추가 (schema / fields / enums / indexes)
2. `model/db/<name>.ts` 에 `BaseOperator` 를 상속한 오퍼레이터 작성
3. `model/<name>.ts` 에 업무 로직 작성 (`CustomError` 로 실패 표현)
4. `app/routes/api/v1/<name>.ts` 또는 `admin/routes/api/<name>.ts` 에 `register(app)` 작성 (zod 로 입력 검증) — 파일을 두면 자동 등록된다
5. 관리 화면이 필요하면 `admin/client/src/pages/<Name>.tsx` 추가 후 `App.tsx` 라우트와 `Layout.tsx` 메뉴에 연결
6. `test/*.test.ts` 에 시나리오 추가

## 7. 운영 (AWS EC2)

```bash
# EC2 에서 1회
bash scripts/ec2_setup.sh          # nvm + Node 22 + pm2 설치, clone, npm ci, 클라이언트 빌드
vi .env                            # '#need to specify' 값 채우기
npm run batch:admin-user -- --id=admin --password='...' --role=admin --dryRun=false
npm run pm2:start && pm2 save && pm2 startup

# 배포
bash scripts/deploy.sh main        # pull → npm ci → typecheck → build:client → pm2 reload
```

- API 서버는 pm2 cluster 모드(CPU 수만큼), 관리 서버는 1개 프로세스로 띄운다 (`ecosystem.config.cjs`).
- ALB / Nginx 뒤에 둘 때는 `server.trustProxy: true` (development 이상 설정에 이미 적용) 로 `X-Forwarded-For` 를 신뢰한다.
- MongoDB / Redis 는 Atlas, ElastiCache 등 관리형 서비스를 권장하며 `MONGO_URI`, `REDIS_URL` 로 연결한다.
- 로그는 `logs/` 아래 날짜별 파일로 남는다 (`app.log`, `app-access.log`, `admin.log`, `admin-access.log`).
- 이미지 업로드는 로컬 디스크(`app/public/img/profile`)에 저장한다. 다중 인스턴스에서는 S3 로 바꿔야 하며 `aws.s3` 설정 자리를 마련해 두었다.

## 8. 원본에서 의도적으로 제외한 것

- 채팅(socket.io) 서버, 결제(IAP/크레딧), 푸시(APNs/FCM) 실제 발송, 이미지 리사이즈(gm), Facebook/Ameba 로그인, New Relic / Bugsnag / Logentries 연동.
  → 설정 자리(`push`, `aws`)와 레이어 구조는 남겨 두었으므로 필요 시 같은 패턴으로 추가한다.
- 원본에 들어 있던 모든 키 / 비밀번호 / 인증서 / 호스트 정보는 가져오지 않았다.

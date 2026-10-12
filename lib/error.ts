/**
 * Error Handler library
 *
 * CustomError(kind, msg, body)
 *   kind : G.err.badrequest 등 (code/msg 를 가진 객체)
 *   msg  : 로그용 상세 메시지 (클라이언트에는 kind.msg 가 내려간다)
 *   body : 클라이언트에 함께 내려줄 data (선택). { message } 를 넣으면 화면 표시용 문구로 쓰인다.
 */
import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import G, { type ErrorKind } from '#config/global';
import { logger } from '#lib/logger';
import { error as errorResponse } from '#lib/response';

export class CustomError extends Error {
	kind: ErrorKind;
	body?: unknown;

	constructor(kind: ErrorKind, msg?: string | Error, body?: unknown) {
		super(typeof msg === 'string' ? msg : msg?.message || kind.msg);
		this.name = 'CustomError';
		this.kind = kind;
		this.body = body;
		if (msg instanceof Error) this.cause = msg;
	}

	/**
	 * 팝업 형태로 에러를 보여줄 때 사용하는 템플릿
	 */
	setPopupData(title: string, text: string): this {
		this.body = { popup: { title, text } };
		return this;
	}
}

/**
 * 라우트에 매칭되지 않은 요청 → 404
 */
export const notFoundHandler: NotFoundHandler = (c) => {
	logger.debug(`${c.req.method} ${c.req.path} -> 404 not found`);
	return errorResponse(c, G.err.notfound);
};

/**
 * 모든 에러의 최종 처리 (app.onError)
 */
export const errorHandler: ErrorHandler = (err, c: Context) => {
	let kind: ErrorKind;
	let body: unknown;

	if (err instanceof CustomError) {
		kind = err.kind;
		body = err.body;
	} else if (err instanceof HTTPException) {
		// hono 내부에서 던지는 예외 (본문 크기 초과, 잘못된 JSON 등)
		kind = err.status === 413 || err.status === 400 ? G.err.badrequest : err.status === 401 ? G.err.unauthorized : err.status === 403 ? G.err.forbidden : err.status === 404 ? G.err.notfound : G.err.other;
	} else if (err instanceof SyntaxError) {
		// JSON 파싱 실패
		kind = G.err.badrequest;
	} else {
		kind = G.err.other;
	}

	if (kind === G.err.other) {
		logger.error(`${c.req.method} ${c.req.path}`);
		logger.error(err.stack || err);
	} else {
		logger.debug(`${c.req.method} ${c.req.path} -> ${kind.code} ${err.message}`);
	}

	return errorResponse(c, kind, body);
};

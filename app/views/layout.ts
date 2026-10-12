/**
 * 서버 렌더 HTML 공통 레이아웃 (hono/html)
 * 템플릿 엔진 없이 html`` 태그 함수로 작성한다. ${} 에 들어가는 값은 자동으로 escape 된다.
 */
import { html, raw } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';
import G from '#config/global';

export interface LayoutOptions {
	title: string;
	content: HtmlEscapedString | Promise<HtmlEscapedString>;
}

export function layout({ title, content }: LayoutOptions) {
	return html`<!doctype html>
<html lang="ko">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${title}</title>
		<link rel="stylesheet" href="/css/base.css" />
	</head>
	<body>
		<header class="site-header"><a class="brand" href="/">${G.config.name === 'app' ? 'API Server' : G.config.name}</a></header>
		<main class="container">${content}</main>
		<footer class="site-footer"><small>env: ${G.env}</small></footer>
	</body>
</html>`;
}

export { html, raw };

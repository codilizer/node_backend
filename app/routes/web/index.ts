/**
 * Web (간단한 안내 페이지)
 */
import type { Hono } from 'hono';
import { indexPage } from '../../views/index.ts';
import { policyPage } from '../../views/policy.ts';
import type { AppEnv } from '#lib/types';

export function register(app: Hono<AppEnv>): void {
	app.get('/', (c) => c.html(indexPage()));
	app.get('/policy', (c) => c.html(policyPage()));
}

/**
 * Upload library
 *
 * Hono 의 c.req.parseBody() 가 돌려주는 File 을 검증하고 디스크에 저장한다.
 * 사용:
 *   const body = await c.req.parseBody();
 *   const url = await saveUploadedFile(body.file, G.path.image.profile, `${G.config.url.img}/profile`);
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import G from '#config/global';
import { CustomError } from '#lib/error';

const EXTENSIONS: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
};

export function isFile(value: unknown): value is File {
	return typeof File !== 'undefined' && value instanceof File;
}

/**
 * 업로드 파일 검증 (mime, 크기)
 */
export function validateFile(file: unknown): File {
	if (!isFile(file)) throw new CustomError(G.err.badrequest, 'file is required');
	const allowed = G.config.upload.allowedMimeTypes || [];
	if (allowed.length > 0 && !allowed.includes(file.type)) {
		throw new CustomError(G.err.badrequest, `file type not allowed: ${file.type}`);
	}
	if (file.size > G.config.upload.maxFileSize) {
		throw new CustomError(G.err.badrequest, 'file is too large');
	}
	return file;
}

/**
 * 파일을 destDir 에 저장하고 공개 URL 을 돌려준다.
 */
export async function saveUploadedFile(file: unknown, destDir: string, publicPrefix: string): Promise<string> {
	const valid = validateFile(file);
	await fs.promises.mkdir(destDir, { recursive: true });

	const ext = EXTENSIONS[valid.type] || path.extname(valid.name || '').toLowerCase() || '.bin';
	const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
	const dest = path.join(destDir, filename);

	await fs.promises.writeFile(dest, Buffer.from(await valid.arrayBuffer()));
	return `${publicPrefix}/${filename}`;
}

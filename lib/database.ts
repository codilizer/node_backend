/**
 * Database library (MongoDB / mongoose)
 *
 *  - 설정(db.mongo)의 각 항목마다 커넥션을 만들고, doc/<dbName>.ts 에 정의된 컬렉션을 모델로 등록한다.
 *  - 원본 프로젝트와 같이 숫자 _id 자동 채번(counter 컬렉션)과 paginate helper 를 제공한다.
 *
 * 사용:
 *   import database from '#lib/database';
 *   await database.connect();
 *   database.collections.user.model.find(...)
 */
import path from 'node:path';
import mongoose, { type Connection, type Model, type Query } from 'mongoose';
import G from '#config/global';
import { logger, queryLogger } from '#lib/logger';
import { CustomError } from '#lib/error';
import type { Paginate, PaginateParams, PagedResult } from '#lib/types';
import type { CollectionDefinition } from '#doc/main';

/** 컬렉션 하나의 런타임 정보 */
export interface Collection {
	name: string;
	dbName: string;
	model: Model<any>;
	fields: Record<string, string[]>;
	enums: Record<string, Record<string, string>>;
}

/**
 * paginate 결과 객체
 */
export function createPaginate(total: number, page: number, skip: number, limit: number): Paginate {
	return {
		total: Number(total) || 0,
		page: Number(page) || 1,
		skip: Number(skip) || 0,
		limit: Number(limit) || G.paginate.defaultLimit,
	};
}

/**
 * paginate 파라미터 정규화. { limit, page, skip, sort } → 실제 skip 계산
 */
export function normalizePaginate(params: PaginateParams = {}) {
	let limit = Number(params.limit) || G.paginate.defaultLimit;
	if (limit > G.paginate.maxLimit) limit = G.paginate.maxLimit;
	const page = Number(params.page) || 1;
	const skip = params.skip ? Number(params.skip) : limit * (page - 1);
	return { limit, page, skip, sort: params.sort || null };
}

/**
 * 목록 + 전체 건수를 함께 돌려준다.
 *   const { list, paginate } = await paginateQuery(Model.find(cond).select(...), params);
 */
export async function paginateQuery<T>(query: Query<any, any>, params: PaginateParams): Promise<PagedResult<T>> {
	const { limit, page, skip, sort } = normalizePaginate(params);
	const filter = query.getFilter();
	const list = (await query.sort(sort || '-_id').skip(skip).limit(limit).lean()) as T[];
	const total = await query.model.countDocuments(filter);
	return { list, paginate: createPaginate(total, page, skip, limit) };
}

/**
 * 전체 건수를 세지 않는 가벼운 페이징. (다음 페이지 존재 여부만 판단)
 */
export async function paginateQueryWithoutTotal<T>(query: Query<any, any>, params: PaginateParams): Promise<PagedResult<T>> {
	const { limit, page, skip, sort } = normalizePaginate(params);
	let q = query.skip(skip).limit(limit + 1);
	if (sort) q = q.sort(sort);
	const list = (await q.lean()) as T[];
	const hasNext = list.length > limit;
	if (hasNext) list.pop();
	const paginate = createPaginate(skip + list.length + (hasNext ? 1 : 0), page, skip, limit);
	paginate.hasNext = hasNext;
	return { list, paginate };
}

/**
 * doc 의 enums 배열을 { KEY: 'value' } 형태로 바꾼다.  ['ios','android'] → { IOS: 'ios', ANDROID: 'android' }
 */
function toEnums(enums: Record<string, readonly string[]> = {}): Record<string, Record<string, string>> {
	const result: Record<string, Record<string, string>> = {};
	for (const [key, values] of Object.entries(enums)) {
		result[key] = {};
		for (const value of values) {
			result[key][String(value).toUpperCase()] = value;
		}
	}
	return result;
}

class DatabaseLibrary {
	mongoose = mongoose;
	connections: Record<string, Connection> = {};
	collections: Record<string, Collection> = {};

	/**
	 * 설정에 정의된 모든 DB 에 접속하고 모델을 등록한다.
	 */
	async connect(): Promise<this> {
		const dbInfo = G.config.db.mongo;

		for (const [dbName, connectInfo] of Object.entries(dbInfo)) {
			const con = mongoose.createConnection(connectInfo.uri, connectInfo.options || {});
			this.connections[dbName] = con;

			con.on('connected', () => logger.info(`mongoose connection open: ${dbName}`));
			con.on('error', (err) => logger.error(`mongoose connection error: ${dbName} ${err}`));
			con.on('disconnected', () => logger.info(`mongoose connection disconnected: ${dbName}`));

			// 스키마 정의 로드 (doc/main.ts 등)
			const dbDoc = (await import(path.join(G.path.doc, `${dbName}.ts`))).default as Record<string, CollectionDefinition>;
			for (const [name, sets] of Object.entries(dbDoc)) {
				const schema = new mongoose.Schema(sets.schema, {
					versionKey: false,
					collection: name,
					...(sets.options || {}),
				});
				for (const index of sets.indexes || []) {
					const { options, ...fields } = index;
					schema.index(fields as Record<string, 1 | -1>, options);
				}
				this.collections[name] = {
					name,
					dbName,
					model: con.model(name, schema),
					fields: sets.fields || {},
					enums: toEnums(sets.enums),
				};
			}

			await con.asPromise();
		}

		// 쿼리 로깅
		mongoose.set('debug', (collectionName: string, method: string, ...args: unknown[]) => {
			if (['createIndex', 'ensureIndex'].includes(method)) return;
			const text = args.map((arg) => JSON.stringify(arg)).join('\t');
			if (['find', 'findOne', 'countDocuments'].includes(method)) {
				queryLogger.debug(`${collectionName}.${method}\t${text}`);
			} else {
				queryLogger.info(`${collectionName}.${method}\t${text}`);
			}
		});

		return this;
	}

	/**
	 * counter 컬렉션으로 다음 시퀀스 번호를 발급한다.
	 */
	async nextSequence(collectionName: string): Promise<number> {
		const counter = this.collections.counter;
		if (!counter) throw new CustomError(G.err.other, 'counter collection is not defined in doc');
		const result = (await counter.model
			.findOneAndUpdate({ _id: collectionName }, { $inc: { seq: 1 } }, { new: true, upsert: true })
			.lean()) as unknown as { seq: number };
		return result.seq;
	}

	/**
	 * 모든 커넥션 종료
	 */
	async close(): Promise<void> {
		for (const con of Object.values(this.connections)) {
			await con.close();
		}
		this.connections = {};
		this.collections = {};
	}
}

const database = new DatabaseLibrary();
export default database;

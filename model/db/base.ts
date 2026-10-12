/**
 * Base Operator (컬렉션 공통 CRUD)
 *
 * model/db/*.ts 는 이 클래스를 상속해 컬렉션별 메서드를 추가한다.
 *   class UserOperator extends BaseOperator<UserDoc> { constructor() { super('user'); } ... }
 *
 * 모든 조회는 lean() 으로 plain object 를 돌려준다.
 * database.connect() 이후에 인스턴스를 만들어야 한다. (라우트/모델은 서버 기동 중 동적 import 된다)
 */
import type { Model } from 'mongoose';
import G from '#config/global';
import database, { paginateQuery, type Collection } from '#lib/database';
import { CustomError } from '#lib/error';
import type { GetParams, PagedResult, PaginateParams } from '#lib/types';

export type Condition = Record<string, unknown>;
export type Update = Record<string, unknown>;
export type Fields = string | string[] | undefined;

export class BaseOperator<T extends { _id: number | string }> {
	readonly name: string;
	readonly model: Model<any>;
	readonly enums: Record<string, Record<string, string>>;
	readonly fields: Record<string, string[]>;

	constructor(collectionName: string) {
		const collection: Collection | undefined = database.collections[collectionName];
		if (!collection) {
			throw new Error(`collection "${collectionName}" is not loaded. database.connect() must be called first`);
		}
		this.name = collection.name;
		this.model = collection.model;
		this.enums = collection.enums;
		this.fields = { ...collection.fields, full: Object.keys(collection.model.schema.paths) };
	}

	/**
	 * 조회 필드 목록 생성. 'tiny' 등 묶음 이름, 콤마 구분 문자열, 배열을 모두 받는다.
	 */
	createFields(fields?: Fields): string[] {
		if (Array.isArray(fields)) return fields;
		if (typeof fields === 'string' && this.fields[fields]) return this.fields[fields];
		if (typeof fields === 'string' && fields.length > 0) return fields.split(',');
		return this.fields.normal || this.fields.small || this.fields.full;
	}

	/**
	 * 에러를 CustomError 로 감싼다. 중복 키는 409.
	 */
	wrapError(err: unknown): CustomError {
		if (err instanceof CustomError) return err;
		const error = err as Error & { code?: number };
		if (error && error.code === 11000) return new CustomError(G.err.conflict, error);
		return new CustomError(G.err.other, error);
	}

	/**
	 * 전체 목록 (페이징)
	 */
	async getAll(params: Pick<GetParams, 'fields' | 'paginate'> | { fields?: string; paginate: PaginateParams }, condition: Condition = {}): Promise<PagedResult<T>> {
		try {
			return await paginateQuery<T>(this.model.find(condition).select(this.createFields(params.fields)), params.paginate);
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * ID 로 1건 조회
	 */
	async getById(id: T['_id'], fields?: Fields): Promise<T | null> {
		try {
			return (await this.model.findById(id).select(this.createFields(fields)).lean()) as T | null;
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * ID 목록으로 조회
	 */
	async getByIds(ids: T['_id'][], fields?: Fields): Promise<T[]> {
		try {
			return (await this.model.find({ _id: { $in: ids } }).select(this.createFields(fields)).lean()) as T[];
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * 조건으로 1건 조회
	 */
	async findOne(condition: Condition, fields?: Fields): Promise<T | null> {
		try {
			return (await this.model.findOne(condition).select(this.createFields(fields)).lean()) as T | null;
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * 건수
	 */
	async count(condition: Condition = {}): Promise<number> {
		try {
			return await this.model.countDocuments(condition);
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * 자동 채번하여 insert. 생성된 문서를 돌려준다.
	 */
	async insert(data: Partial<T>): Promise<T> {
		try {
			const seq = await database.nextSequence(this.name);
			const doc = await this.model.create({ ...data, _id: seq });
			return doc.toObject() as T;
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * 자동 채번 없이 insert (_id 를 직접 지정하거나 ObjectId 를 쓰는 컬렉션용)
	 */
	async insertWithoutSequence(data: Partial<T>): Promise<T> {
		try {
			const doc = await this.model.create(data);
			return doc.toObject() as T;
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * ID 로 수정. updated 를 자동 갱신하고 수정된 문서를 돌려준다.
	 * update 에 $set/$unset 등 연산자가 없으면 전체를 $set 으로 취급한다.
	 */
	async updateById(id: T['_id'], update: Update, fields?: Fields): Promise<T | null> {
		try {
			const hasOperator = Object.keys(update).some((key) => key.startsWith('$'));
			const payload: Record<string, unknown> = hasOperator ? { ...update } : { $set: update };
			if (this.model.schema.paths.updated) {
				payload.$set = { ...((payload.$set as Record<string, unknown>) || {}), updated: new Date() };
			}
			return (await this.model.findByIdAndUpdate(id, payload, { new: true }).select(this.createFields(fields)).lean()) as T | null;
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * 조건에 맞는 문서가 있으면 수정, 없으면 자동 채번 insert
	 */
	async updateOrInsert(condition: Condition, update: Update): Promise<T> {
		try {
			const exists = (await this.model.findOne(condition).select('_id').lean()) as { _id: T['_id'] } | null;
			if (exists) {
				return (await this.updateById(exists._id, update, 'full')) as T;
			}
			const data: Record<string, unknown> = { ...condition };
			for (const [key, value] of Object.entries(update)) {
				if (key.startsWith('$')) {
					Object.assign(data, value);
				} else {
					data[key] = value;
				}
			}
			return await this.insert(data as Partial<T>);
		} catch (err) {
			throw this.wrapError(err);
		}
	}

	/**
	 * ID 로 삭제. 삭제된 건수를 돌려준다.
	 */
	async deleteById(id: T['_id'] | null | undefined): Promise<number> {
		if (id === null || id === undefined) return 0;
		try {
			const result = await this.model.deleteOne({ _id: id });
			return result.deletedCount || 0;
		} catch (err) {
			throw this.wrapError(err);
		}
	}
}

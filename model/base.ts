/**
 * Base Model (비즈니스 모델 공통)
 *
 * model/*.ts 는 이 클래스를 상속해 업무 메서드를 붙인다.
 */
import G from '#config/global';
import database from '#lib/database';
import type { GetParams } from '#lib/types';

export class BaseModel {
	/**
	 * 요청 쿼리를 조회 파라미터로 변환한다.
	 *   ?fields=small&limit=20&page=2&sort=-created&keyword=abc
	 */
	createGetParams(query: Record<string, string | undefined>): GetParams {
		const fieldNames = ['tiny', 'small', 'normal', 'large', 'full'];

		let limit = parseInt(query.limit || '', 10) || G.paginate.defaultLimit;
		if (limit > G.paginate.maxLimit) limit = G.paginate.maxLimit;

		return {
			fields: query.fields && fieldNames.includes(query.fields) ? query.fields : '',
			paginate: {
				limit,
				page: parseInt(query.page || '', 10) || 1,
				skip: parseInt(query.skip || '', 10) || 0,
				sort: query.sort || null,
			},
			search: {
				keyword: query.keyword || query.text || null,
				type: query.type || null,
				start: query.start ? new Date(query.start) : null,
				end: query.end ? new Date(query.end) : null,
			},
		};
	}

	/**
	 * 특정 컬렉션의 enum 값을 검사하는 정규식을 돌려준다.
	 *   createRegExp('user', 'gender')        → /^(male|female|other)$/
	 *   createRegExp('user', 'gender', true)  → 콤마 구분 다중 값 허용
	 */
	createRegExp(collectionName: string, enumName: string, multi = false): RegExp {
		const collection = database.collections[collectionName];
		if (!collection) throw new Error(`collection not found: ${collectionName}`);
		const values = Object.values(collection.enums[enumName] || {});
		const joined = values.join('|');
		const pattern = multi ? `^(${joined})(,(${joined}))*$` : `^(${joined})$`;
		return new RegExp(pattern);
	}

	/**
	 * 컬렉션 enum 값 배열
	 */
	getEnumValues(collectionName: string, enumName: string): string[] {
		const collection = database.collections[collectionName];
		return collection ? Object.values(collection.enums[enumName] || {}) : [];
	}
}

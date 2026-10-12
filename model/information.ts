/**
 * Information Model (운영 공지)
 */
import G from '#config/global';
import { CustomError } from '#lib/error';
import { BaseModel } from '#model/base';
import dbInformation, { type InformationInput } from '#model/db/information';
import type { InformationDoc, PagedResult, PaginateParams } from '#lib/types';

class InformationModel extends BaseModel {
	enums = dbInformation.enums;

	insert(data: InformationInput): Promise<InformationDoc> {
		return dbInformation.insertInformation(data);
	}

	async update(id: number, data: InformationInput): Promise<InformationDoc> {
		const information = await dbInformation.updateInformation(id, data);
		if (!information) throw new CustomError(G.err.notfound, 'information not found');
		return information;
	}

	async getById(id: number): Promise<InformationDoc> {
		const information = await dbInformation.getById(id, 'normal');
		if (!information) throw new CustomError(G.err.notfound, 'information not found');
		return information;
	}

	/**
	 * 관리자용 전체 목록
	 */
	getAll(params: { fields?: string; paginate: PaginateParams }): Promise<PagedResult<InformationDoc>> {
		return dbInformation.getAll({ ...params, paginate: { ...params.paginate, sort: params.paginate.sort || '-publishedAt' } });
	}

	/**
	 * 사용자용 공개 목록
	 */
	getPublished(params: { fields?: string; paginate: PaginateParams }): Promise<PagedResult<InformationDoc>> {
		return dbInformation.getPublished(params);
	}

	deleteById(id: number): Promise<number> {
		return dbInformation.deleteById(id);
	}
}

const informationModel = new InformationModel();
export default informationModel;

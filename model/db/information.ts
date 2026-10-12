/**
 * Information Collection Operator (운영 공지)
 */
import { BaseOperator } from '#model/db/base';
import type { InformationDoc, InformationType, PagedResult, PaginateParams } from '#lib/types';

export interface InformationInput {
	title?: string;
	content?: string;
	url?: string;
	type?: InformationType;
	isPublished?: boolean;
	publishedAt?: Date;
}

class InformationOperator extends BaseOperator<InformationDoc> {
	constructor() {
		super('information');
	}

	insertInformation({ title, content, url, type, isPublished, publishedAt }: InformationInput): Promise<InformationDoc> {
		return this.insert({
			title: title!,
			content: content || '',
			url: url || '',
			type: type || 'all',
			isPublished: isPublished !== false,
			publishedAt: publishedAt || new Date(),
		});
	}

	updateInformation(id: number, { title, content, url, type, isPublished, publishedAt }: InformationInput): Promise<InformationDoc | null> {
		const set: Record<string, unknown> = {};
		if (title !== undefined) set.title = title;
		if (content !== undefined) set.content = content;
		if (url !== undefined) set.url = url;
		if (type !== undefined) set.type = type;
		if (isPublished !== undefined) set.isPublished = isPublished;
		if (publishedAt !== undefined) set.publishedAt = publishedAt;
		return this.updateById(id, set, 'normal');
	}

	/**
	 * 공개 중인 공지만 (API 서버용)
	 */
	getPublished(params: { fields?: string; paginate: PaginateParams }): Promise<PagedResult<InformationDoc>> {
		return this.getAll(
			{ ...params, paginate: { ...params.paginate, sort: '-publishedAt' } },
			{ isPublished: true, publishedAt: { $lte: new Date() }, type: { $in: ['all', 'custom'] } }
		);
	}
}

const dbInformation = new InformationOperator();
export default dbInformation;

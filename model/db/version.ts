/**
 * Version Collection Operator (앱 버전)
 */
import { BaseOperator } from '#model/db/base';
import type { DeviceType, VersionDoc } from '#lib/types';

export interface VersionInput {
	version?: string;
	minVersion?: string;
	storeUrl?: string;
}

class VersionOperator extends BaseOperator<VersionDoc> {
	constructor() {
		super('version');
	}

	/**
	 * 디바이스 종류별 버전 정보 저장 (없으면 생성)
	 */
	upsert(type: DeviceType, { version, minVersion, storeUrl }: VersionInput): Promise<VersionDoc> {
		const set: Record<string, unknown> = {};
		if (version !== undefined) set.version = version;
		if (minVersion !== undefined) set.minVersion = minVersion;
		if (storeUrl !== undefined) set.storeUrl = storeUrl;
		return this.updateOrInsert({ type }, set);
	}

	getByType(type: DeviceType): Promise<VersionDoc | null> {
		return this.findOne({ type }, 'normal');
	}

	async getList(): Promise<VersionDoc[]> {
		try {
			return (await this.model.find({}).select(this.createFields('normal')).sort('type').lean()) as unknown as VersionDoc[];
		} catch (err) {
			throw this.wrapError(err);
		}
	}
}

const dbVersion = new VersionOperator();
export default dbVersion;

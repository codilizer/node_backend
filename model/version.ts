/**
 * Version Model (앱 버전 / 강제 업데이트 판단)
 */
import { BaseModel } from '#model/base';
import dbVersion, { type VersionInput } from '#model/db/version';
import type { DeviceType, VersionDoc } from '#lib/types';

export interface VersionCheckResult {
	type: DeviceType;
	version: string | null;
	minVersion: string | null;
	storeUrl: string | null;
	needUpdate: boolean;
	forceUpdate: boolean;
}

class VersionModel extends BaseModel {
	enums = dbVersion.enums;

	/**
	 * 'a.b.c' 형식 비교. a < b 이면 -1, 같으면 0, 크면 1
	 */
	compare(a: string | undefined | null, b: string | undefined | null): number {
		const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
		const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
		const length = Math.max(pa.length, pb.length);
		for (let i = 0; i < length; i++) {
			const x = pa[i] || 0;
			const y = pb[i] || 0;
			if (x !== y) return x < y ? -1 : 1;
		}
		return 0;
	}

	/**
	 * 디바이스 종류의 버전 정보와 현재 앱 버전으로 업데이트 필요 여부를 계산한다.
	 */
	async check(type: DeviceType, currentVersion: string | null): Promise<VersionCheckResult> {
		const info = await dbVersion.getByType(type);
		if (!info) return { type, version: null, minVersion: null, storeUrl: null, needUpdate: false, forceUpdate: false };

		const needUpdate = currentVersion ? this.compare(currentVersion, info.version) < 0 : false;
		const forceUpdate = currentVersion && info.minVersion ? this.compare(currentVersion, info.minVersion) < 0 : false;
		return {
			type,
			version: info.version || null,
			minVersion: info.minVersion || null,
			storeUrl: info.storeUrl || null,
			needUpdate,
			forceUpdate,
		};
	}

	upsert(type: DeviceType, data: VersionInput): Promise<VersionDoc> {
		return dbVersion.upsert(type, data);
	}

	getList(): Promise<VersionDoc[]> {
		return dbVersion.getList();
	}
}

const versionModel = new VersionModel();
export default versionModel;

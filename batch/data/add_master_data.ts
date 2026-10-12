/**
 * 마스터 데이터 초기화 배치
 *
 *   npm run batch:master-data -- --dryRun=false
 *
 * 앱 버전 기본값과 샘플 공지를 넣는다. 이미 있으면 건너뛴다.
 */
import batch from '../base.ts';
import versionModel from '#model/version';
import informationModel from '#model/information';
import type { DeviceType } from '#lib/types';

const defaultVersions: { type: DeviceType; version: string; minVersion: string; storeUrl: string }[] = [
	{ type: 'ios', version: '1.0.0', minVersion: '1.0.0', storeUrl: 'https://apps.apple.com/app/id0000000000' }, // #need to specify
	{ type: 'android', version: '1.0.0', minVersion: '1.0.0', storeUrl: 'https://play.google.com/store/apps/details?id=com.example.app' }, // #need to specify
];

batch.push(async (dryRun) => {
	const existing = await versionModel.getList();
	for (const item of defaultVersions) {
		if (existing.some((v) => v.type === item.type)) {
			batch.logger.info(`version ${item.type} already exists, skip`);
			continue;
		}
		batch.logger.info(`insert version ${item.type} ${item.version}`);
		if (!dryRun) await versionModel.upsert(item.type, item);
	}
});

batch.push(async (dryRun) => {
	const { paginate } = await informationModel.getAll({ paginate: { limit: 1, page: 1 } });
	if (paginate.total > 0) {
		batch.logger.info('information already exists, skip');
		return;
	}
	batch.logger.info('insert sample information');
	if (!dryRun) {
		await informationModel.insert({
			title: '서비스 오픈 안내',
			content: '서비스가 오픈되었습니다. 이 공지는 관리 페이지에서 수정/삭제할 수 있습니다.',
			type: 'all',
			isPublished: true,
		});
	}
});

await batch.start('add_master_data');

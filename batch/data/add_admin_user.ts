/**
 * 관리자 계정 생성 배치
 *
 *   npm run batch:admin-user -- --id=admin --password='Secret123!' --name='최고관리자' --role=admin --dryRun=false
 *   (NODE_ENV 또는 --env 로 환경 지정)
 *
 * role: admin | operator (기본 operator)
 */
import batch from '../base.ts';
import adminModel from '#model/admin';
import type { AdminRole } from '#lib/types';

const id = String(batch.args.id || '');
const password = String(batch.args.password || '');
const name = batch.args.name ? String(batch.args.name) : id;
const email = batch.args.email ? String(batch.args.email) : undefined;
const role = (batch.args.role as AdminRole) || 'operator';

batch.push(async (dryRun) => {
	if (!id || !password) {
		throw new Error('--id 와 --password 는 필수입니다. 예) --id=admin --password=Secret123! --role=admin');
	}
	if (!['admin', 'operator'].includes(role)) {
		throw new Error(`role 은 admin 또는 operator 여야 합니다: ${role}`);
	}
	if (password.length < 8) {
		throw new Error('password 는 8자 이상이어야 합니다.');
	}

	batch.logger.info(`create admin user: id=${id}, name=${name}, role=${role}`);
	if (dryRun) {
		batch.logger.info('dryRun 이므로 실제로 생성하지 않습니다. 반영하려면 --dryRun=false 를 붙여 주세요.');
		return;
	}
	const admin = await adminModel.createAdmin({ adminId: id, password, name, email, role });
	batch.logger.info(`created: _id=${admin._id}`);
});

await batch.start('add_admin_user');

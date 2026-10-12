/**
 * pm2 설정 (원본 process.yml 대체)
 *
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 reload ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup   (재부팅 시 자동 시작)
 *
 * Node 22 가 .ts 를 직접 실행하므로 빌드 없이 서버 파일을 그대로 지정한다.
 * API 서버는 cluster 모드로 CPU 수만큼, 관리 서버는 1개만 띄운다.
 */
module.exports = {
	apps: [
		{
			name: 'api',
			script: 'app/server.ts',
			interpreter: 'node',
			instances: 'max',
			exec_mode: 'cluster',
			max_memory_restart: '512M',
			env: { NODE_ENV: 'development' },
			env_staging: { NODE_ENV: 'staging' },
			env_production: { NODE_ENV: 'production' },
			out_file: 'logs/pm2-api.out.log',
			error_file: 'logs/pm2-api.err.log',
			merge_logs: true,
			time: true,
		},
		{
			name: 'admin',
			script: 'admin/server.ts',
			interpreter: 'node',
			instances: 1,
			exec_mode: 'fork',
			max_memory_restart: '512M',
			env: { NODE_ENV: 'development' },
			env_staging: { NODE_ENV: 'staging' },
			env_production: { NODE_ENV: 'production' },
			out_file: 'logs/pm2-admin.out.log',
			error_file: 'logs/pm2-admin.err.log',
			merge_logs: true,
			time: true,
		},
	],
};

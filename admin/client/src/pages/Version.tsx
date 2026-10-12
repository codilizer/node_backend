/**
 * 앱 버전 관리
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api.ts';
import { formatDate } from '../util.ts';
import { Notice, useNotice } from '../components/Notice.tsx';
import type { AppVersion, DeviceType } from '../types.ts';

const TYPES: DeviceType[] = ['ios', 'android', 'other'];

type VersionForm = { version: string; minVersion: string; storeUrl: string; updated?: string };

const emptyVersions = (): Record<DeviceType, VersionForm> => ({
	ios: { version: '', minVersion: '', storeUrl: '' },
	android: { version: '', minVersion: '', storeUrl: '' },
	other: { version: '', minVersion: '', storeUrl: '' },
});

export default function VersionPage() {
	const notice = useNotice();
	const [versions, setVersions] = useState(emptyVersions());

	const load = useCallback(async () => {
		const res = await api.getVersions();
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		const next = emptyVersions();
		for (const item of res.data as AppVersion[]) {
			if (!next[item.type]) continue;
			next[item.type] = { version: item.version || '', minVersion: item.minVersion || '', storeUrl: item.storeUrl || '', updated: item.updated };
		}
		setVersions(next);
	}, [notice]);

	useEffect(() => {
		load();
	}, [load]);

	function patch(type: DeviceType, changes: Partial<VersionForm>) {
		setVersions((prev) => ({ ...prev, [type]: { ...prev[type], ...changes } }));
	}

	async function save(type: DeviceType, e: FormEvent) {
		e.preventDefault();
		const form = versions[type];
		if (!form.version) return notice.notify('최신 버전을 입력해 주세요.', true);
		const res = await api.updateVersion(type, { version: form.version, min_version: form.minVersion, store_url: form.storeUrl });
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		notice.notify(`${type} 버전 정보를 저장했습니다.`);
		load();
	}

	return (
		<div>
			<h4 className="mb-3">앱 버전 관리</h4>
			<p className="text-muted small">
				클라이언트는 <code>GET /api/v1/app/version?type=ios&version=1.0.0</code> 으로 최신 버전과 강제 업데이트 여부를 확인합니다. 최소 버전보다 낮은 앱은
				forceUpdate=true 를 받습니다.
			</p>
			<Notice message={notice.message} error={notice.error} />

			<div className="row g-3">
				{TYPES.map((type) => (
					<div className="col-md-4" key={type}>
						<div className="card">
							<div className="card-body">
								<h6 className="card-title text-uppercase">{type}</h6>
								<form onSubmit={(e) => save(type, e)}>
									<div className="mb-2">
										<label className="form-label small">최신 버전</label>
										<input className="form-control" value={versions[type].version} onChange={(e) => patch(type, { version: e.target.value })} placeholder="1.0.0" />
									</div>
									<div className="mb-2">
										<label className="form-label small">최소 버전 (강제 업데이트 기준)</label>
										<input className="form-control" value={versions[type].minVersion} onChange={(e) => patch(type, { minVersion: e.target.value })} placeholder="1.0.0" />
									</div>
									<div className="mb-2">
										<label className="form-label small">스토어 URL</label>
										<input className="form-control" value={versions[type].storeUrl} onChange={(e) => patch(type, { storeUrl: e.target.value })} placeholder="https://..." />
									</div>
									{versions[type].updated && <div className="small text-muted mb-2">수정: {formatDate(versions[type].updated, true)}</div>}
									<button className="btn btn-dark btn-sm" type="submit">
										저장
									</button>
								</form>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

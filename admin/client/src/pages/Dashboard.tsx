/**
 * 대시보드
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.ts';
import { formatDate } from '../util.ts';
import type { DashboardCounts } from '../types.ts';

function Card({ label, value, sub, className }: { label: string; value: number; sub?: string; className?: string }) {
	return (
		<div className="col-6 col-lg-3">
			<div className="card text-center">
				<div className="card-body">
					<div className="text-muted small">{label}</div>
					<div className={`fs-3 ${className || ''}`}>
						{value}
						{sub && <small className="text-muted fs-6"> {sub}</small>}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function DashboardPage() {
	const [counts, setCounts] = useState<DashboardCounts | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async (refresh: boolean) => {
		setLoading(true);
		const res = await api.getDashboardCounts(refresh);
		setLoading(false);
		if (res.meta.code === 200) setCounts(res.data);
	}, []);

	useEffect(() => {
		load(false);
	}, [load]);

	return (
		<div>
			<div className="d-flex justify-content-between align-items-center mb-3">
				<h4 className="mb-0">대시보드</h4>
				<button className="btn btn-sm btn-outline-secondary" onClick={() => load(true)} disabled={loading}>
					새로 고침
				</button>
			</div>

			{counts ? (
				<>
					<div className="row g-3">
						<Card label="전체 회원" value={counts.users.total} />
						<Card label="활동 회원" value={counts.users.active} />
						<Card label="정지 회원" value={counts.users.forbidden} className="text-danger" />
						<Card label="탈퇴 회원" value={counts.users.retired} className="text-secondary" />
					</div>
					<div className="row g-3 mt-1">
						<Card label="오늘 가입" value={counts.signups.today} />
						<Card label="최근 7일 가입" value={counts.signups.week} />
						<Card label="오늘 로그인 (회원 수)" value={counts.logins.todayUsers} sub={`/ ${counts.logins.today}회`} />
						<Card label="최근 7일 로그인 회원" value={counts.logins.weekUsers} />
					</div>
					<p className="text-muted small mt-3">집계 시각: {formatDate(counts.generatedAt, true)} (10분 캐시)</p>
				</>
			) : (
				loading && <p className="text-muted">불러오는 중...</p>
			)}
		</div>
	);
}

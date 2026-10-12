/**
 * 회원 검색/목록
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, errorMessage } from '../api.ts';
import { createPagination, formatDate, type Pagination } from '../util.ts';
import type { User } from '../types.ts';
import Pager from '../components/Pager.tsx';

function StatusBadge({ user }: { user: User }) {
	if (user.deleteFlag) return <span className="badge bg-secondary">탈퇴</span>;
	if (user.status?.forbidden) return <span className="badge bg-danger">정지</span>;
	return <span className="badge bg-success">정상</span>;
}

export default function UserListPage() {
	const [type, setType] = useState('all');
	const [keyword, setKeyword] = useState('');
	const [includeRetired, setIncludeRetired] = useState(false);
	const [forbiddenOnly, setForbiddenOnly] = useState(false);
	const [userList, setUserList] = useState<User[]>([]);
	const [pagination, setPagination] = useState<Pagination | null>(null);
	const [searched, setSearched] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const search = useCallback(
		async (page: number) => {
			if (type === 'userId' && keyword && !/^[0-9]+$/.test(keyword)) {
				return setError('회원 번호는 숫자만 입력해 주세요.');
			}
			const res = await api.searchUsers({ type, keyword, page, limit: 20, include_retired: includeRetired, forbidden_only: forbiddenOnly });
			if (res.meta.code !== 200) return setError(errorMessage(res));
			setError(null);
			setSearched(true);
			setUserList(res.data);
			if (res.paginate) setPagination(createPagination(page, res.paginate.total, res.paginate.limit));
		},
		[type, keyword, includeRetired, forbiddenOnly]
	);

	useEffect(() => {
		search(1);
		// 처음 진입 시 1회만 전체 목록을 불러온다.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function submit(e: FormEvent) {
		e.preventDefault();
		search(1);
	}

	return (
		<div>
			<h4 className="mb-3">회원 관리</h4>
			<form className="row g-2 align-items-end mb-3" onSubmit={submit}>
				<div className="col-md-2">
					<label className="form-label small">검색 기준</label>
					<select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
						<option value="all">전체</option>
						<option value="userId">회원 번호</option>
						<option value="loginId">로그인 ID</option>
						<option value="name">이름</option>
						<option value="email">이메일</option>
					</select>
				</div>
				<div className="col-md-4">
					<label className="form-label small">검색어</label>
					<input className="form-control" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="비워두면 전체 목록" />
				</div>
				<div className="col-md-auto">
					<div className="form-check">
						<input id="includeRetired" className="form-check-input" type="checkbox" checked={includeRetired} onChange={(e) => setIncludeRetired(e.target.checked)} />
						<label className="form-check-label small" htmlFor="includeRetired">
							탈퇴 포함
						</label>
					</div>
					<div className="form-check">
						<input id="forbiddenOnly" className="form-check-input" type="checkbox" checked={forbiddenOnly} onChange={(e) => setForbiddenOnly(e.target.checked)} />
						<label className="form-check-label small" htmlFor="forbiddenOnly">
							정지 회원만
						</label>
					</div>
				</div>
				<div className="col-md-auto">
					<button className="btn btn-dark" type="submit">
						검색
					</button>
				</div>
			</form>

			{error && <div className="alert alert-danger py-2">{error}</div>}

			<table className="table table-sm table-hover align-middle">
				<thead>
					<tr>
						<th style={{ width: 80 }}>ID</th>
						<th>로그인 ID</th>
						<th>이름</th>
						<th>이메일</th>
						<th>상태</th>
						<th>가입일</th>
						<th>최근 로그인</th>
					</tr>
				</thead>
				<tbody>
					{userList.map((user) => (
						<tr key={user._id}>
							<td>
								<Link to={`/admin/user/${user._id}`}>{user._id}</Link>
							</td>
							<td>{user.loginId}</td>
							<td>{user.name}</td>
							<td>{user.email || '-'}</td>
							<td>
								<StatusBadge user={user} />
							</td>
							<td className="small">{formatDate(user.created)}</td>
							<td className="small">{formatDate(user.status?.lastLoginAt, true)}</td>
						</tr>
					))}
				</tbody>
			</table>
			{searched && userList.length === 0 && <p className="text-muted">검색 조건에 맞는 회원이 없습니다.</p>}

			<Pager pagination={pagination} onChange={search} />
		</div>
	);
}

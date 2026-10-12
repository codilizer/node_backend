/**
 * 회원 상세
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { api, errorMessage } from '../api.ts';
import { createPagination, formatDate, toInputDate, type Pagination } from '../util.ts';
import { useAuth } from '../components/AuthContext.ts';
import { Notice, useNotice } from '../components/Notice.tsx';
import Pager from '../components/Pager.tsx';
import type { ApiResponse, LoginHistory, User } from '../types.ts';

type Mode = 'edit' | 'loginHistory' | 'memo' | 'account';

export default function UserDetailPage() {
	const { userId = '' } = useParams();
	const { me } = useAuth();
	const notice = useNotice();

	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(false);
	const [mode, setMode] = useState<Mode>('edit');
	const [form, setForm] = useState({ name: '', gender: '', birthday: '', description: '' });
	const [memo, setMemo] = useState('');
	const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
	const [loginPagination, setLoginPagination] = useState<Pagination | null>(null);
	const [forbiddenReason, setForbiddenReason] = useState('');
	const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		const res = await api.getUser(userId);
		setLoading(false);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		setUser(res.data);
		setForm({
			name: res.data.name || '',
			gender: res.data.gender || '',
			birthday: toInputDate(res.data.birthday),
			description: res.data.description || '',
		});
		setMemo(res.data.memo || '');
	}, [userId, notice]);

	useEffect(() => {
		load();
	}, [load]);

	function applyResult(res: ApiResponse<User>, message: string) {
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		setUser((prev) => ({ ...(prev as User), ...res.data }));
		notice.notify(message);
	}

	async function saveProfile(e: FormEvent) {
		e.preventDefault();
		applyResult(await api.updateUser(userId, form), '기본 정보를 저장했습니다.');
	}

	async function showLoginHistory(page: number) {
		setMode('loginHistory');
		const res = await api.getUserLoginHistory(userId, page);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		setLoginHistory(res.data);
		if (res.paginate) setLoginPagination(createPagination(page, res.paginate.total, res.paginate.limit));
	}

	async function saveMemo() {
		const res = await api.updateUserMemo(userId, memo);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		notice.notify('메모를 저장했습니다.');
	}

	async function resetPassword() {
		if (!confirm('이 회원의 비밀번호를 초기화하고 임시 비밀번호를 발급할까요?')) return;
		const res = await api.resetUserPassword(userId);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		setTemporaryPassword(res.data.mailed ? null : res.data.temporaryPassword);
		notice.notify(res.data.mailed ? '임시 비밀번호를 메일로 발송했습니다.' : '임시 비밀번호를 발급했습니다. 회원에게 직접 전달해 주세요.');
	}

	async function forceLogout() {
		if (!confirm('이 회원을 모든 기기에서 로그아웃시킬까요?')) return;
		const res = await api.forceLogoutUser(userId);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		notice.notify('강제 로그아웃 처리했습니다.');
	}

	async function forbid() {
		if (!confirm('이 회원을 이용 정지할까요?')) return;
		applyResult(await api.forbidUser(userId, forbiddenReason), '이용 정지 처리했습니다.');
	}

	async function recover() {
		if (!confirm('이용 정지를 해제할까요?')) return;
		applyResult(await api.recoverUser(userId), '이용 정지를 해제했습니다.');
	}

	async function retire() {
		if (!confirm('정말 강제 탈퇴 처리할까요? 되돌릴 수 없습니다.')) return;
		applyResult(await api.retireUser(userId), '강제 탈퇴 처리했습니다.');
	}

	const tab = (key: Mode, label: string, onClick?: () => void) => (
		<li className="nav-item" key={key}>
			<a className={`nav-link${mode === key ? ' active' : ''}`} onClick={onClick || (() => setMode(key))}>
				{label}
			</a>
		</li>
	);

	return (
		<div>
			<div className="d-flex align-items-center mb-3">
				<Link className="btn btn-sm btn-outline-secondary me-2" to="/admin/users">
					&larr; 목록
				</Link>
				<h4 className="mb-0">회원 정보</h4>
				{user && <span className="ms-2 text-muted">#{user._id}</span>}
			</div>

			<Notice message={notice.message} error={notice.error} />

			{!user && loading && <p className="text-muted">불러오는 중...</p>}
			{user && (
				<div className="row">
					<div className="col-md-4">
						<div className="card mb-3">
							<div className="card-body">
								<div className="text-center mb-2">
									{user.picture?.main ? (
										<img className="rounded" src={user.picture.main} style={{ maxWidth: 160 }} alt="profile" />
									) : (
										<div className="text-muted small">(프로필 이미지 없음)</div>
									)}
								</div>
								<dl className="row mb-0 small">
									<dt className="col-5">로그인 ID</dt>
									<dd className="col-7">{user.loginId}</dd>
									<dt className="col-5">이름</dt>
									<dd className="col-7">{user.name}</dd>
									<dt className="col-5">이메일</dt>
									<dd className="col-7">{user.email || '-'}</dd>
									<dt className="col-5">성별</dt>
									<dd className="col-7">{user.gender || '-'}</dd>
									<dt className="col-5">생년월일</dt>
									<dd className="col-7">{formatDate(user.birthday)}</dd>
									<dt className="col-5">가입일</dt>
									<dd className="col-7">{formatDate(user.created, true)}</dd>
									<dt className="col-5">최근 로그인</dt>
									<dd className="col-7">{formatDate(user.status?.lastLoginAt, true)}</dd>
									<dt className="col-5">로그인 횟수</dt>
									<dd className="col-7">{user.status?.loginCount || 0}</dd>
									<dt className="col-5">디바이스</dt>
									<dd className="col-7">
										{user.device?.type} {user.device?.appVersion}
									</dd>
									<dt className="col-5">상태</dt>
									<dd className="col-7">
										{user.deleteFlag ? (
											<span className="badge bg-secondary">탈퇴 ({formatDate(user.deletedAt)})</span>
										) : user.status?.forbidden ? (
											<span className="badge bg-danger">정지</span>
										) : (
											<span className="badge bg-success">정상</span>
										)}
									</dd>
								</dl>
								{user.status?.forbidden && (
									<p className="text-danger small mb-0">
										정지 사유: {user.status.forbiddenReason} ({formatDate(user.status.forbiddenAt, true)})
									</p>
								)}
							</div>
						</div>

						<ul className="nav nav-pills flex-column">
							{tab('edit', '기본 정보 수정')}
							{tab('loginHistory', '로그인 이력', () => showLoginHistory(1))}
							{tab('memo', '관리자 메모')}
							{tab('account', '계정 관리')}
						</ul>
					</div>

					<div className="col-md-8">
						{mode === 'edit' && (
							<div className="card">
								<div className="card-body">
									<h6 className="card-title">기본 정보 수정</h6>
									<form onSubmit={saveProfile}>
										<div className="mb-2">
											<label className="form-label small">이름</label>
											<input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
										</div>
										<div className="mb-2">
											<label className="form-label small">성별</label>
											<select className="form-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
												<option value="">(미설정)</option>
												<option value="male">male</option>
												<option value="female">female</option>
												<option value="other">other</option>
											</select>
										</div>
										<div className="mb-2">
											<label className="form-label small">생년월일</label>
											<input type="date" className="form-control" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
										</div>
										<div className="mb-2">
											<label className="form-label small">소개</label>
											<textarea className="form-control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
										</div>
										<button className="btn btn-dark" type="submit" disabled={user.deleteFlag}>
											저장
										</button>
									</form>
								</div>
							</div>
						)}

						{mode === 'loginHistory' && (
							<div className="card">
								<div className="card-body">
									<h6 className="card-title">로그인 이력</h6>
									<table className="table table-sm">
										<thead>
											<tr>
												<th>일시</th>
												<th>디바이스</th>
												<th>IP</th>
												<th>User-Agent</th>
											</tr>
										</thead>
										<tbody>
											{loginHistory.map((login) => (
												<tr key={login._id}>
													<td className="small">{formatDate(login.created, true)}</td>
													<td className="small">{login.device}</td>
													<td className="small">{login.ip}</td>
													<td className="small text-truncate" style={{ maxWidth: 300 }} title={login.userAgent}>
														{login.userAgent}
													</td>
												</tr>
											))}
										</tbody>
									</table>
									{loginHistory.length === 0 && <p className="text-muted small">로그인 이력이 없습니다.</p>}
									<Pager pagination={loginPagination} onChange={showLoginHistory} />
								</div>
							</div>
						)}

						{mode === 'memo' && (
							<div className="card">
								<div className="card-body">
									<h6 className="card-title">관리자 메모</h6>
									<textarea className="form-control mb-2" rows={6} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="이 회원에 대한 운영 메모" />
									<button className="btn btn-dark" onClick={saveMemo}>
										저장
									</button>
								</div>
							</div>
						)}

						{mode === 'account' && (
							<div className="card">
								<div className="card-body">
									<h6 className="card-title">계정 관리</h6>
									<dl className="row">
										<dt className="col-sm-4">비밀번호 초기화</dt>
										<dd className="col-sm-8">
											<button className="btn btn-sm btn-outline-dark" onClick={resetPassword} disabled={user.deleteFlag}>
												임시 비밀번호 발급
											</button>
											<div className="small text-muted mt-1">이메일이 등록되어 있으면 메일로 발송되고, 없으면 아래에 표시됩니다.</div>
											{temporaryPassword && (
												<div className="alert alert-info py-2 mt-2">
													임시 비밀번호: <b>{temporaryPassword}</b>
												</div>
											)}
										</dd>
										<dt className="col-sm-4">강제 로그아웃</dt>
										<dd className="col-sm-8">
											<button className="btn btn-sm btn-outline-warning" onClick={forceLogout} disabled={user.deleteFlag}>
												모든 기기에서 로그아웃
											</button>
										</dd>
										<dt className="col-sm-4">이용 정지</dt>
										<dd className="col-sm-8">
											{!user.status?.forbidden && !user.deleteFlag && (
												<div className="input-group input-group-sm">
													<input className="form-control" value={forbiddenReason} onChange={(e) => setForbiddenReason(e.target.value)} placeholder="정지 사유" />
													<button className="btn btn-danger" onClick={forbid}>
														정지
													</button>
												</div>
											)}
											{user.status?.forbidden && (
												<button className="btn btn-sm btn-outline-success" onClick={recover}>
													정지 해제
												</button>
											)}
										</dd>
										{me.authority === 'admin' && (
											<>
												<dt className="col-sm-4">강제 탈퇴</dt>
												<dd className="col-sm-8">
													<button className="btn btn-sm btn-danger" onClick={retire} disabled={user.deleteFlag}>
														강제 탈퇴
													</button>
													<div className="small text-muted mt-1">탈퇴 처리된 회원은 로그인할 수 없으며 복구되지 않습니다.</div>
												</dd>
											</>
										)}
									</dl>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

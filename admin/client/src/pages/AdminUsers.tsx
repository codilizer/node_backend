/**
 * 관리자 계정 관리 (admin 권한)
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api.ts';
import { formatDate, isEmail } from '../util.ts';
import { useAuth } from '../components/AuthContext.ts';
import { Notice, useNotice } from '../components/Notice.tsx';
import type { AdminUser } from '../types.ts';

const emptyForm = () => ({ admin_id: '', password: '', name: '', email: '', role: 'operator' });

export default function AdminUsersPage() {
	const { me } = useAuth();
	const notice = useNotice();
	const [list, setList] = useState<AdminUser[]>([]);
	const [form, setForm] = useState(emptyForm());

	const load = useCallback(async () => {
		const res = await api.getAdminUsers();
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		setList(res.data);
	}, [notice]);

	useEffect(() => {
		load();
	}, [load]);

	function patch(id: number, changes: Partial<AdminUser>) {
		setList((prev) => prev.map((admin) => (admin._id === id ? { ...admin, ...changes } : admin)));
	}

	async function insert(e: FormEvent) {
		e.preventDefault();
		if (!form.admin_id || !form.password) return notice.notify('아이디와 비밀번호를 입력해 주세요.', true);
		if (form.email && !isEmail(form.email)) return notice.notify('이메일 형식이 올바르지 않습니다.', true);

		const payload: Record<string, unknown> = { ...form };
		if (!form.email) delete payload.email;
		if (!form.name) payload.name = form.admin_id;

		const res = await api.insertAdminUser(payload);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		setForm(emptyForm());
		notice.notify('관리자를 추가했습니다.');
		load();
	}

	async function update(admin: AdminUser) {
		const res = await api.updateAdminUser(admin._id, { name: admin.name, email: admin.email || '', role: admin.role, status: admin.status });
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		notice.notify('저장했습니다.');
		load();
	}

	async function resetPassword(admin: AdminUser) {
		const password = prompt(`${admin.adminId} 의 새 비밀번호를 입력하세요. (8~64자, 공백 없이)`);
		if (!password) return;
		const res = await api.updateAdminUserPassword(admin._id, password);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		notice.notify('비밀번호를 변경했습니다.');
	}

	async function remove(admin: AdminUser) {
		if (!confirm(`${admin.adminId} 관리자를 삭제할까요?`)) return;
		const res = await api.deleteAdminUser(admin._id);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		notice.notify('삭제했습니다.');
		load();
	}

	return (
		<div>
			<h4 className="mb-3">관리자 계정</h4>
			<Notice message={notice.message} error={notice.error} />

			<div className="card mb-3">
				<div className="card-body">
					<h6 className="card-title">관리자 추가</h6>
					<form className="row g-2" onSubmit={insert}>
						<div className="col-md-2">
							<input className="form-control" value={form.admin_id} onChange={(e) => setForm({ ...form, admin_id: e.target.value })} placeholder="아이디" autoComplete="off" />
						</div>
						<div className="col-md-2">
							<input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="비밀번호" autoComplete="new-password" />
						</div>
						<div className="col-md-2">
							<input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름" />
						</div>
						<div className="col-md-3">
							<input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="이메일 (선택)" />
						</div>
						<div className="col-md-2">
							<select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
								<option value="operator">operator (운영)</option>
								<option value="admin">admin (최고 관리자)</option>
							</select>
						</div>
						<div className="col-md-1">
							<button className="btn btn-dark w-100" type="submit">
								추가
							</button>
						</div>
					</form>
					<p className="small text-muted mb-0 mt-2">operator 는 조회/운영 기능만, admin 은 관리자 계정 관리와 강제 탈퇴까지 사용할 수 있습니다.</p>
				</div>
			</div>

			<table className="table table-sm table-hover align-middle">
				<thead>
					<tr>
						<th style={{ width: 60 }}>ID</th>
						<th>아이디</th>
						<th>이름</th>
						<th>이메일</th>
						<th>권한</th>
						<th>상태</th>
						<th>최근 로그인</th>
						<th style={{ width: 260 }}></th>
					</tr>
				</thead>
				<tbody>
					{list.map((admin) => {
						const isMe = admin._id === me.adminUserId;
						return (
							<tr key={admin._id}>
								<td>{admin._id}</td>
								<td>{admin.adminId}</td>
								<td>
									<input className="form-control form-control-sm" value={admin.name || ''} onChange={(e) => patch(admin._id, { name: e.target.value })} />
								</td>
								<td>
									<input className="form-control form-control-sm" value={admin.email || ''} onChange={(e) => patch(admin._id, { email: e.target.value })} />
								</td>
								<td>
									<select className="form-select form-select-sm" value={admin.role} disabled={isMe} onChange={(e) => patch(admin._id, { role: e.target.value as AdminUser['role'] })}>
										<option value="operator">operator</option>
										<option value="admin">admin</option>
									</select>
								</td>
								<td>
									<select className="form-select form-select-sm" value={admin.status} disabled={isMe} onChange={(e) => patch(admin._id, { status: e.target.value as AdminUser['status'] })}>
										<option value="active">active</option>
										<option value="inactive">inactive</option>
									</select>
								</td>
								<td className="small">{formatDate(admin.lastLoginAt, true)}</td>
								<td>
									<button className="btn btn-sm btn-outline-dark me-1" onClick={() => update(admin)}>
										저장
									</button>
									<button className="btn btn-sm btn-outline-warning me-1" onClick={() => resetPassword(admin)}>
										비밀번호
									</button>
									<button className="btn btn-sm btn-outline-danger" onClick={() => remove(admin)} disabled={isMe}>
										삭제
									</button>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{list.length === 0 && <p className="text-muted">등록된 관리자가 없습니다. 비상 계정으로 로그인한 상태라면 먼저 관리자를 추가해 주세요.</p>}
		</div>
	);
}

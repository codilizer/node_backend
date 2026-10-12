/**
 * 내 비밀번호 변경
 */
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api.ts';
import { Notice, useNotice } from '../components/Notice.tsx';

export default function MyPasswordPage() {
	const notice = useNotice();
	const [form, setForm] = useState({ current: '', next: '', confirm: '' });

	async function submit(e: FormEvent) {
		e.preventDefault();
		if (!form.current || !form.next) return notice.notify('모든 항목을 입력해 주세요.', true);
		if (form.next !== form.confirm) return notice.notify('새 비밀번호 확인이 일치하지 않습니다.', true);
		if (form.next.length < 8) return notice.notify('새 비밀번호는 8자 이상이어야 합니다.', true);

		const res = await api.changeMyPassword(form.current, form.next);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		notice.notify('비밀번호를 변경했습니다.');
		setForm({ current: '', next: '', confirm: '' });
	}

	return (
		<div>
			<h4 className="mb-3">내 비밀번호 변경</h4>
			<Notice message={notice.message} error={notice.error} />
			<div className="card" style={{ maxWidth: 480 }}>
				<div className="card-body">
					<form onSubmit={submit}>
						<div className="mb-2">
							<label className="form-label small">현재 비밀번호</label>
							<input type="password" className="form-control" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} autoComplete="current-password" />
						</div>
						<div className="mb-2">
							<label className="form-label small">새 비밀번호</label>
							<input type="password" className="form-control" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} autoComplete="new-password" />
						</div>
						<div className="mb-3">
							<label className="form-label small">새 비밀번호 확인</label>
							<input type="password" className="form-control" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
						</div>
						<button className="btn btn-dark" type="submit">
							변경
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}

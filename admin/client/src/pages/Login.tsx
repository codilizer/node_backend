/**
 * 관리자 로그인 화면
 */
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api.ts';

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => Promise<void> }) {
	const [id, setId] = useState('');
	const [password, setPassword] = useState('');
	const [alert, setAlert] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function submit(e: FormEvent) {
		e.preventDefault();
		if (!id || !password) return setAlert('아이디와 비밀번호를 입력해 주세요.');
		setLoading(true);
		const res = await api.login(id, password);
		setLoading(false);
		if (res.meta.code !== 200) return setAlert(errorMessage(res));
		setAlert(null);
		await onLoggedIn();
	}

	return (
		<>
			<nav className="navbar navbar-dark bg-dark">
				<div className="container-fluid">
					<span className="navbar-brand">Admin</span>
				</div>
			</nav>
			<div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
				<div className="card shadow-sm">
					<div className="card-body">
						<h5 className="card-title mb-3">관리자 로그인</h5>
						{alert && <div className="alert alert-danger py-2">{alert}</div>}
						<form onSubmit={submit}>
							<div className="mb-3">
								<label className="form-label" htmlFor="id">
									아이디
								</label>
								<input id="id" className="form-control" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoFocus />
							</div>
							<div className="mb-3">
								<label className="form-label" htmlFor="password">
									비밀번호
								</label>
								<input
									id="password"
									type="password"
									className="form-control"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									autoComplete="current-password"
								/>
							</div>
							<button className="btn btn-dark w-100" type="submit" disabled={loading}>
								{loading ? '확인 중...' : '로그인'}
							</button>
						</form>
					</div>
				</div>
			</div>
		</>
	);
}

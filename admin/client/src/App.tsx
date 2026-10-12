/**
 * 관리 페이지 라우팅 + 로그인 상태 관리
 *
 * 처음 로드 시 /api/v1/admin/me 로 로그인 여부를 확인하고,
 * 로그인되어 있지 않으면 로그인 화면을, 되어 있으면 레이아웃 + 각 화면을 보여준다.
 */
import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { api, setUnauthorizedHandler } from './api.ts';
import type { AdminMe } from './types.ts';
import { AuthContext } from './components/AuthContext.ts';
import Layout from './components/Layout.tsx';
import LoginPage from './pages/Login.tsx';
import DashboardPage from './pages/Dashboard.tsx';
import UserListPage from './pages/UserList.tsx';
import UserDetailPage from './pages/UserDetail.tsx';
import InformationPage from './pages/Information.tsx';
import AdminUsersPage from './pages/AdminUsers.tsx';
import VersionPage from './pages/Version.tsx';
import MyPasswordPage from './pages/MyPassword.tsx';

export default function App() {
	const [me, setMe] = useState<AdminMe | null>(null);
	const [checked, setChecked] = useState(false);

	const refresh = useCallback(async () => {
		const res = await api.getMe();
		setMe(res.meta.code === 200 ? res.data : null);
		setChecked(true);
	}, []);

	useEffect(() => {
		setUnauthorizedHandler(() => setMe(null));
		refresh();
	}, [refresh]);

	const logout = useCallback(async () => {
		await api.logout();
		setMe(null);
	}, []);

	if (!checked) {
		return <div className="p-5 text-muted">불러오는 중...</div>;
	}

	if (!me) {
		return <LoginPage onLoggedIn={refresh} />;
	}

	return (
		<AuthContext.Provider value={{ me, logout, refresh }}>
			<Layout>
				<Routes>
					<Route path="/admin" element={<DashboardPage />} />
					<Route path="/admin/users" element={<UserListPage />} />
					<Route path="/admin/user/:userId" element={<UserDetailPage />} />
					<Route path="/admin/information" element={<InformationPage />} />
					<Route path="/admin/version" element={<VersionPage />} />
					<Route path="/admin/my/password" element={<MyPasswordPage />} />
					{me.authority === 'admin' && <Route path="/admin/admin_users" element={<AdminUsersPage />} />}
					<Route path="*" element={<Navigate to="/admin" replace />} />
				</Routes>
			</Layout>
		</AuthContext.Provider>
	);
}

/**
 * 공통 레이아웃 (상단 바 + 좌측 메뉴)
 */
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { useAuth } from './AuthContext.ts';

const menuClass = ({ isActive }: { isActive: boolean }) => `list-group-item list-group-item-action${isActive ? ' active' : ''}`;

export default function Layout({ children }: { children: ReactNode }) {
	const { me, logout } = useAuth();

	return (
		<>
			<nav className="navbar navbar-dark bg-dark fixed-top">
				<div className="container-fluid">
					<Link className="navbar-brand" to="/admin">
						Admin
					</Link>
					<div className="d-flex align-items-center text-white-50 small">
						<span className="me-3">
							{me.name} ({me.authority})
						</span>
						<button type="button" className="btn btn-link btn-sm text-white-50 text-decoration-none p-0" onClick={logout}>
							로그아웃
						</button>
					</div>
				</div>
			</nav>

			<div className="container-fluid" style={{ paddingTop: 70 }}>
				<div className="row">
					<div className="col-md-3 col-lg-2 mb-3 sidebar">
						<div className="list-group shadow-sm">
							<NavLink to="/admin" end className={menuClass}>
								대시보드
							</NavLink>
							<NavLink to="/admin/users" className={menuClass}>
								회원 관리
							</NavLink>
							<NavLink to="/admin/information" className={menuClass}>
								공지 관리
							</NavLink>
							<NavLink to="/admin/version" className={menuClass}>
								앱 버전 관리
							</NavLink>
							{me.authority === 'admin' && (
								<NavLink to="/admin/admin_users" className={menuClass}>
									관리자 계정
								</NavLink>
							)}
							<NavLink to="/admin/my/password" className={menuClass}>
								내 비밀번호 변경
							</NavLink>
						</div>
						<div className="text-muted small mt-2 px-1">env: {me.env}</div>
					</div>
					<div className="col-md-9 col-lg-10">{children}</div>
				</div>
			</div>
		</>
	);
}

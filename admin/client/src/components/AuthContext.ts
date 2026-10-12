/**
 * 로그인한 관리자 정보 컨텍스트
 */
import { createContext, useContext } from 'react';
import type { AdminMe } from '../types.ts';

export interface AuthContextValue {
	me: AdminMe;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
	const value = useContext(AuthContext);
	if (!value) throw new Error('AuthContext is not provided');
	return value;
}

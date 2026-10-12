/**
 * 성공/오류 메시지 표시 + 상태 훅
 */
import { useCallback, useState } from 'react';

export interface NoticeState {
	message: string | null;
	error: string | null;
}

export function useNotice() {
	const [state, setState] = useState<NoticeState>({ message: null, error: null });
	const notify = useCallback((text: string, isError = false) => {
		setState(isError ? { message: null, error: text } : { message: text, error: null });
	}, []);
	const clear = useCallback(() => setState({ message: null, error: null }), []);
	return { ...state, notify, clear };
}

export function Notice({ message, error }: NoticeState) {
	return (
		<>
			{message && <div className="alert alert-success py-2">{message}</div>}
			{error && <div className="alert alert-danger py-2">{error}</div>}
		</>
	);
}

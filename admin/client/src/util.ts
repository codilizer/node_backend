/**
 * 화면 공통 유틸 (페이징, 날짜 포맷)
 */

export interface PaginationItem {
	page: number;
	text: string;
	active: boolean;
}

export interface Pagination {
	page: number;
	total: number;
	items: PaginationItem[];
}

/**
 * 페이징 정보 생성. 최대 10개 페이지 번호를 보여준다.
 */
export function createPagination(page: number, total: number, limit: number): Pagination {
	const PAGING_LIMIT = 10;
	const pageTotal = Math.max(1, Math.ceil((total || 0) / (limit || 10)));
	let start = Math.max(1, page - Math.floor(PAGING_LIMIT / 2));
	const end = Math.min(pageTotal, start + PAGING_LIMIT - 1);
	start = Math.max(1, end - PAGING_LIMIT + 1);

	const items: PaginationItem[] = [];
	for (let i = start; i <= end; i++) {
		items.push({ page: i, text: String(i), active: i === page });
	}
	return { page, total: pageTotal, items };
}

function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

/**
 * 날짜 포맷. withTime 이 true 면 시:분 포함
 */
export function formatDate(value: string | Date | undefined | null, withTime = false): string {
	if (!value) return '-';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	let text = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	if (withTime) text += ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
	return text;
}

/** Date → input[type=date] 값 (YYYY-MM-DD) */
export function toInputDate(value: string | undefined | null): string {
	if (!value) return '';
	return formatDate(value);
}

/** Date → input[type=datetime-local] 값 (YYYY-MM-DDTHH:mm) */
export function toInputDateTime(value: string | undefined | null): string {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isEmail(str: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str || '');
}

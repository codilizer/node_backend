/**
 * 페이지 번호 목록
 */
import type { Pagination } from '../util.ts';

export default function Pager({ pagination, onChange }: { pagination: Pagination | null; onChange: (page: number) => void }) {
	if (!pagination || pagination.total <= 1) return null;
	return (
		<nav>
			<ul className="pagination pagination-sm">
				<li className="page-item">
					<a className="page-link" onClick={() => onChange(1)}>
						&laquo;
					</a>
				</li>
				{pagination.items.map((item) => (
					<li key={item.page} className={`page-item${item.active ? ' active' : ''}`}>
						<a className="page-link" onClick={() => onChange(item.page)}>
							{item.text}
						</a>
					</li>
				))}
				<li className="page-item">
					<a className="page-link" onClick={() => onChange(pagination.total)}>
						&raquo;
					</a>
				</li>
			</ul>
		</nav>
	);
}

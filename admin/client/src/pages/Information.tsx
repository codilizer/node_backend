/**
 * 운영 공지 관리
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api.ts';
import { createPagination, formatDate, toInputDateTime, type Pagination } from '../util.ts';
import { Notice, useNotice } from '../components/Notice.tsx';
import Pager from '../components/Pager.tsx';
import type { Information } from '../types.ts';

interface Form {
	title: string;
	content: string;
	url: string;
	type: string;
	is_published: boolean;
	published_at: string;
}

const emptyForm = (): Form => ({ title: '', content: '', url: '', type: 'all', is_published: true, published_at: '' });

export default function InformationPage() {
	const notice = useNotice();
	const [list, setList] = useState<Information[]>([]);
	const [pagination, setPagination] = useState<Pagination | null>(null);
	const [page, setPage] = useState(1);
	const [form, setForm] = useState<Form>(emptyForm());
	const [editing, setEditing] = useState<Information | null>(null);

	const load = useCallback(
		async (p: number) => {
			setPage(p);
			const res = await api.getInformationAll(p);
			if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
			setList(res.data);
			if (res.paginate) setPagination(createPagination(p, res.paginate.total, res.paginate.limit));
		},
		[notice]
	);

	useEffect(() => {
		load(1);
	}, [load]);

	async function submit(e: FormEvent) {
		e.preventDefault();
		if (!form.title.trim()) return notice.notify('제목을 입력해 주세요.', true);
		if (form.url && !/^https?:\/\//.test(form.url)) return notice.notify('URL 은 http:// 또는 https:// 로 시작해야 합니다.', true);

		const payload: Record<string, unknown> = { ...form };
		if (!form.published_at) delete payload.published_at;
		else payload.published_at = new Date(form.published_at).toISOString();

		const res = editing ? await api.updateInformation(editing._id, payload) : await api.insertInformation(payload);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);

		notice.notify(editing ? '공지를 수정했습니다.' : '공지를 등록했습니다.');
		const nextPage = editing ? page : 1;
		cancelEdit();
		load(nextPage);
	}

	function edit(info: Information) {
		setEditing(info);
		setForm({
			title: info.title,
			content: info.content || '',
			url: info.url || '',
			type: info.type,
			is_published: !!info.isPublished,
			published_at: toInputDateTime(info.publishedAt),
		});
	}

	function cancelEdit() {
		setEditing(null);
		setForm(emptyForm());
	}

	async function remove(info: Information) {
		if (!confirm(`"${info.title}" 공지를 삭제할까요?`)) return;
		const res = await api.deleteInformation(info._id);
		if (res.meta.code !== 200) return notice.notify(errorMessage(res), true);
		notice.notify('공지를 삭제했습니다.');
		load(page);
	}

	return (
		<div>
			<h4 className="mb-3">공지 관리</h4>
			<Notice message={notice.message} error={notice.error} />

			<div className="card mb-3">
				<div className="card-body">
					<h6 className="card-title">{editing ? `공지 수정 #${editing._id}` : '새 공지 작성'}</h6>
					<form onSubmit={submit}>
						<div className="row g-2">
							<div className="col-md-8">
								<input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="제목 (필수)" maxLength={140} />
							</div>
							<div className="col-md-2">
								<select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
									<option value="all">전체</option>
									<option value="person">개별</option>
									<option value="custom">커스텀</option>
								</select>
							</div>
							<div className="col-md-2">
								<select className="form-select" value={String(form.is_published)} onChange={(e) => setForm({ ...form, is_published: e.target.value === 'true' })}>
									<option value="true">공개</option>
									<option value="false">비공개</option>
								</select>
							</div>
							<div className="col-md-8">
								<input className="form-control" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="링크 URL (선택, https://...)" />
							</div>
							<div className="col-md-4">
								<input type="datetime-local" className="form-control" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} />
							</div>
							<div className="col-12">
								<textarea className="form-control" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="내용 (선택)" />
							</div>
						</div>
						<div className="mt-2">
							<button className="btn btn-dark me-2" type="submit">
								{editing ? '수정 저장' : '등록'}
							</button>
							{editing && (
								<button className="btn btn-outline-secondary" type="button" onClick={cancelEdit}>
									취소
								</button>
							)}
						</div>
					</form>
				</div>
			</div>

			<table className="table table-sm table-hover align-middle">
				<thead>
					<tr>
						<th style={{ width: 60 }}>ID</th>
						<th>제목</th>
						<th>종류</th>
						<th>공개</th>
						<th>게시일</th>
						<th style={{ width: 140 }}></th>
					</tr>
				</thead>
				<tbody>
					{list.map((info) => (
						<tr key={info._id}>
							<td>{info._id}</td>
							<td>
								<div>{info.title}</div>
								{info.url && (
									<a className="small" href={info.url} target="_blank" rel="noreferrer">
										{info.url}
									</a>
								)}
							</td>
							<td>{info.type}</td>
							<td>{info.isPublished ? <span className="badge bg-success">공개</span> : <span className="badge bg-secondary">비공개</span>}</td>
							<td className="small">{formatDate(info.publishedAt, true)}</td>
							<td>
								<button className="btn btn-sm btn-outline-dark me-1" onClick={() => edit(info)}>
									수정
								</button>
								<button className="btn btn-sm btn-outline-danger" onClick={() => remove(info)}>
									삭제
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{list.length === 0 && <p className="text-muted">등록된 공지가 없습니다.</p>}
			<Pager pagination={pagination} onChange={load} />
		</div>
	);
}

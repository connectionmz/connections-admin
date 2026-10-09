import { useEffect, useMemo, useState } from 'react';
import { ENGAGEMENT, ENGAGEMENT_LABEL } from '../../domain/engagement';
import { safePlainText } from '../../utils/safeText';
import { AdminCard, EmptyState, SecondaryButton } from '../admin/ui/AdminUI';

const PAGE_SIZE = 20;

export const STATUS_STYLE = Object.freeze({
  [ENGAGEMENT.ACTIVE]: 'bg-green-50 text-green-700',
  [ENGAGEMENT.AT_RISK]: 'bg-amber-50 text-amber-800',
  [ENGAGEMENT.OFFLINE]: 'bg-red-50 text-red-700',
  [ENGAGEMENT.NEVER]: 'bg-slate-100 text-slate-700',
});

const dateFormatter = new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-MZ', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = value => (value ? dateFormatter.format(value) : '');
export const formatDateTime = value => (value ? dateTimeFormatter.format(value) : '');

export const StatusBadge = ({ status }) => <span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[status] || STATUS_STYLE.never}`}>{ENGAGEMENT_LABEL[status] || status}</span>;

const normalize = value => String(value ?? '').trim().toLowerCase();
const provinceOf = row => safePlainText(row.provincia || row.province, 80);
const sectorOf = row => safePlainText(row.sector || row.sectorName, 120);

const EngagementTable = ({
  rows, title, description, showStatusFilter = false, defaultWithoutRecentContact = false,
  hasRecentContact = () => false, renderLastContact, renderActions, renderBulkActions, onOpen,
}) => {
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState('');
  const [withoutRecentContact, setWithoutRecentContact] = useState(defaultWithoutRecentContact);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());

  const provinces = useMemo(() => [...new Set(rows.map(provinceOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt')), [rows]);
  const sectors = useMemo(() => [...new Set(rows.map(sectorOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt')), [rows]);
  const filtered = useMemo(() => {
    const term = normalize(search);
    return rows.filter(row => (!term || [row.nome, row.emailAddress, row.contacto, row.phoneNumber].some(value => normalize(value).includes(term)))
      && (!province || provinceOf(row) === province)
      && (!sector || sectorOf(row) === sector)
      && (!status || row.status === status)
      && (!withoutRecentContact || !hasRecentContact(row)));
  }, [rows, search, province, sector, status, withoutRecentContact, hasRecentContact]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedRows = useMemo(() => filtered.filter(row => selected.has(row.id)), [filtered, selected]);
  const allFilteredSelected = filtered.length > 0 && selectedRows.length === filtered.length;

  useEffect(() => setPage(1), [search, province, sector, status, withoutRecentContact]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const toggle = id => setSelected(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allFilteredSelected ? new Set() : new Set(filtered.map(row => row.id)));
  const clearSelection = () => setSelected(new Set());

  return <AdminCard className="overflow-hidden">
    <div className="border-b border-gray-200 p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-bold text-gray-950">{title}</h2><span className="text-sm font-semibold text-gray-600">{filtered.length} de {rows.length} empresa(s)</span></div>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto_auto] xl:items-center">
        <input aria-label="Pesquisar empresas" value={search} onChange={event => setSearch(event.target.value)} className="rounded-lg border px-3 py-2" placeholder="Pesquisar nome, email ou contacto" />
        <select aria-label="Filtrar província" value={province} onChange={event => setProvince(event.target.value)} className="rounded-lg border px-3 py-2"><option value="">Todas as províncias</option>{provinces.map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filtrar sector" value={sector} onChange={event => setSector(event.target.value)} className="rounded-lg border px-3 py-2"><option value="">Todos os sectores</option>{sectors.map(value => <option key={value} value={value}>{value}</option>)}</select>
        {showStatusFilter && <select aria-label="Filtrar estado" value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border px-3 py-2"><option value="">Todos os estados</option>{Object.entries(ENGAGEMENT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={withoutRecentContact} onChange={event => setWithoutRecentContact(event.target.checked)} />Sem contacto nos últimos 7 dias</label>
      </div>
    </div>

    {selectedRows.length > 0 && <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm font-bold text-blue-900">{selectedRows.length} selecionada(s)</p>
      <div className="flex flex-wrap items-center gap-2">{renderBulkActions?.(selectedRows, clearSelection)}<SecondaryButton type="button" onClick={clearSelection}>Limpar seleção</SecondaryButton></div>
    </div>}

    {filtered.length === 0 ? <EmptyState title="Nenhuma empresa encontrada" description="Ajuste a pesquisa ou os filtros." /> : <>
      <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50"><tr>
          <th className="px-4 py-3 text-left"><input type="checkbox" aria-label="Selecionar todos (filtrados)" title="Selecionar todos (filtrados)" checked={allFilteredSelected} onChange={toggleAll} /></th>
          {['Empresa', 'Email', 'Contacto', 'Último acesso', 'Dias sem acesso', 'Último contacto CRM', 'Ações'].map(label => <th key={label} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase text-gray-500">{label}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-gray-100">{paged.map(row => <tr key={row.id} className="align-top hover:bg-gray-50">
          <td className="px-4 py-4"><input type="checkbox" aria-label={`Selecionar ${row.nome || 'empresa'}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
          <td className="min-w-[14rem] px-4 py-4">
            <button type="button" onClick={() => onOpen?.(row)} className="text-left font-semibold text-blue-800 hover:underline">{row.nome || 'Empresa sem nome'}</button>
            <p className="text-xs text-gray-500">{[provinceOf(row), sectorOf(row)].filter(Boolean).join(' · ') || 'Sem província ou sector'}</p>
            {showStatusFilter && <div className="mt-1"><StatusBadge status={row.status} /></div>}
          </td>
          <td className="px-4 py-4 text-sm text-gray-700">{row.emailAddress || <span className="text-gray-400">Sem email</span>}</td>
          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">{safePlainText(row.contacto, 60) || <span className="text-gray-400">Sem contacto</span>}</td>
          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">{row.lastAccessAt ? formatDate(row.lastAccessAt) : 'Nunca'}</td>
          <td className="px-4 py-4 text-sm font-semibold text-gray-900">{row.daysSinceAccess ?? '—'}</td>
          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">{renderLastContact ? renderLastContact(row) : '—'}</td>
          <td className="px-4 py-4">{renderActions?.(row)}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">A mostrar {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}</p>
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton type="button" onClick={toggleAll}>{allFilteredSelected ? 'Desmarcar todos' : `Selecionar todos (${filtered.length})`}</SecondaryButton>
          <SecondaryButton type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</SecondaryButton>
          <span className="text-sm font-semibold">{page} de {pageCount}</span>
          <SecondaryButton type="button" disabled={page === pageCount} onClick={() => setPage(value => value + 1)}>Seguinte</SecondaryButton>
        </div>
      </div>
    </>}
  </AdminCard>;
};

export default EngagementTable;

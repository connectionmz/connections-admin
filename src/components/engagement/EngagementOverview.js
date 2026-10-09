import { useMemo } from 'react';
import { ArcElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { countByEngagement, ENGAGEMENT, ENGAGEMENT_LABEL } from '../../domain/engagement';
import { AdminCard, EmptyState } from '../admin/ui/AdminUI';

ChartJS.register(ArcElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

const STATUS_ORDER = [ENGAGEMENT.ACTIVE, ENGAGEMENT.AT_RISK, ENGAGEMENT.OFFLINE, ENGAGEMENT.NEVER];
const STATUS_COLOR = { active: '#15803d', at_risk: '#d97706', offline: '#b91c1c', never: '#64748b' };

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } },
    tooltip: { callbacks: { label: context => {
      const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
      return `${context.label}: ${context.raw} (${total ? Math.round(context.raw / total * 100) : 0}%)`;
    } } },
  },
};
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } },
  interaction: { intersect: false, mode: 'index' },
};

const Metric = ({ label, value, help, onClick }) => {
  const content = <><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>{help && <p className="mt-1 text-xs text-gray-500">{help}</p>}</>;
  return <AdminCard className="p-5">{onClick ? <button type="button" onClick={onClick} className="w-full text-left">{content}</button> : content}</AdminCard>;
};

const RankedList = ({ title, description, items, value, empty, onOpen }) => <AdminCard className="overflow-hidden">
  <div className="border-b border-gray-200 p-5"><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-gray-500">{description}</p></div>
  {items.length === 0 ? <EmptyState title={empty} /> : <ol className="divide-y divide-gray-100">{items.map((item, index) => <li key={item.id} className="flex items-center gap-3 px-5 py-3">
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-800">{index + 1}</span>
    <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 truncate text-left font-semibold text-gray-900 hover:underline">{item.nome || 'Empresa sem nome'}</button>
    <span className="text-sm font-bold text-gray-700">{value(item)}</span>
  </li>)}</ol>}
</AdminCard>;

const EngagementOverview = ({ list, byDay, reactivation, onSelectTab, onOpen }) => {
  const counts = useMemo(() => countByEngagement(list), [list]);
  const total = list.length;
  const active7d = list.filter(item => item.accesses7d > 0).length;
  const accessesToday = list.reduce((sum, item) => sum + item.accessesToday, 0);
  const accesses30d = list.reduce((sum, item) => sum + item.accesses30d, 0);
  const today = useMemo(() => list.filter(item => item.accessesToday > 0).sort((a, b) => b.accessesToday - a.accessesToday).slice(0, 10), [list]);
  const mostActive = useMemo(() => list.filter(item => item.accesses30d > 0).sort((a, b) => b.accesses30d - a.accesses30d).slice(0, 10), [list]);

  const statusData = {
    labels: STATUS_ORDER.map(status => ENGAGEMENT_LABEL[status]),
    datasets: [{ data: STATUS_ORDER.map(status => counts[status]), backgroundColor: STATUS_ORDER.map(status => STATUS_COLOR[status]), borderColor: '#ffffff', borderWidth: 2 }],
  };
  const weekData = {
    labels: byDay.map(day => day.label),
    datasets: [{ label: 'Acessos', data: byDay.map(day => day.count), borderColor: '#1d4ed8', backgroundColor: 'rgba(29, 78, 216, 0.12)', fill: true, tension: 0.35, pointRadius: 4 }],
  };

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de engajamento">
      <Metric label="Total de empresas" value={total} help="Exclui contas de singulares" onClick={() => onSelectTab('all')} />
      <Metric label="Ativas" value={counts.active} help="Último acesso há 1 dia ou menos" onClick={() => onSelectTab('all')} />
      <Metric label="Em risco" value={counts.at_risk} help="Último acesso há 2 a 7 dias" onClick={() => onSelectTab('at_risk')} />
      <Metric label="Offline" value={counts.offline} help="Sem acesso há mais de 7 dias" onClick={() => onSelectTab('offline')} />
      <Metric label="Nunca acederam" value={counts.never} help="Sem qualquer acesso registado" onClick={() => onSelectTab('never')} />
      <Metric label="Ativas nos últimos 7 dias" value={`${total ? (active7d / total * 100).toFixed(1) : '0.0'}%`} help={`${active7d} empresa(s) com pelo menos um acesso`} />
      <Metric label="Acessos hoje" value={accessesToday} help={`${accesses30d} acesso(s) nos últimos 30 dias`} />
      {reactivation && <Metric label="Reativadas após contacto (30 dias)" value={`${reactivation.rate.toFixed(1)}%`} help={`${reactivation.reactivated} de ${reactivation.contacted} empresa(s) contactada(s)`} />}
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <AdminCard className="p-5"><h2 className="text-lg font-bold">Estado das empresas</h2><p className="text-sm text-gray-500">Distribuição pelo último acesso.</p><div className="mt-4 h-72">{total ? <Doughnut data={statusData} options={doughnutOptions} /> : <EmptyState title="Sem empresas" />}</div></AdminCard>
      <AdminCard className="p-5"><h2 className="text-lg font-bold">Acessos nos últimos 7 dias</h2><p className="text-sm text-gray-500">Todos os acessos registados, hoje incluído.</p><div className="mt-4 h-72"><Line data={weekData} options={lineOptions} /></div></AdminCard>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <RankedList title="Hoje" description="Empresas com acessos desde a meia-noite." items={today} value={item => `${item.accessesToday} acesso(s)`} empty="Nenhum acesso registado hoje" onOpen={onOpen} />
      <RankedList title="Mais ativas (30 dias)" description="Ordenadas pelo número de acessos nos últimos 30 dias." items={mostActive} value={item => `${item.accesses30d} acesso(s)`} empty="Sem acessos nos últimos 30 dias" onOpen={onOpen} />
    </div>
  </div>;
};

export default EngagementOverview;

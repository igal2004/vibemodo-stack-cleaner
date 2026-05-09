import {
  AlertTriangle,
  ArchiveRestore,
  CheckCircle2,
  DatabaseBackup,
  FileSearch,
  Gauge,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { installedApps, renderedHtml, themeLiquid as seedTheme } from './data/sampleScan';
import { classifyScripts, createThemeBackup, safelyRemoveScript, summarizeScan } from './lib/scanner';

const statusStyles = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  orphan: 'bg-red-100 text-red-800 border-red-200'
};

export default function App() {
  const [themeLiquid, setThemeLiquid] = useState(seedTheme);
  const [backups, setBackups] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activity, setActivity] = useState('Scanner ready. No theme changes have been made.');

  const scanItems = useMemo(() => classifyScripts(renderedHtml, installedApps), []);
  const visibleItems = selectedStatus === 'all' ? scanItems : scanItems.filter((item) => item.status === selectedStatus);
  const metrics = summarizeScan(scanItems);

  function handleSafeDelete(item) {
    if (item.status !== 'orphan' || item.risk === 'blocked') return;

    const backup = createThemeBackup(themeLiquid, `Safe delete before removing ${item.appName}`);
    const result = safelyRemoveScript(themeLiquid, item.src);

    if (!result.changed) {
      setActivity(result.warning);
      return;
    }

    setBackups((current) => [backup, ...current]);
    setThemeLiquid(result.themeLiquid);
    setActivity(`Backed up theme.liquid and removed ${item.appName} script.`);
  }

  function rollbackLatest() {
    const [latest, ...rest] = backups;
    if (!latest) return;

    setThemeLiquid(latest.content);
    setBackups(rest);
    setActivity(`Rollback restored ${latest.file} from ${new Date(latest.createdAt).toLocaleString()}.`);
  }

  return (
    <main className="min-h-screen bg-[#eef1e9] text-ink">
      <section className="border-b border-line bg-[#f8faf3]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-citron">
                <Sparkles size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">VIBEMODO Stack Cleaner</h1>
                <p className="text-sm text-zinc-600">Performance audit for orphan Shopify theme scripts</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm">
                <RefreshCw size={16} />
                Rescan
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-zinc-400"
                disabled={!backups.length}
                onClick={rollbackLatest}
              >
                <ArchiveRestore size={16} />
                Rollback
              </button>
            </div>
          </header>

          <div className="grid metric-grid gap-3">
            <Metric icon={Gauge} label="Health Score" value={`${metrics.healthScore}/100`} tone="ink" />
            <Metric icon={Zap} label="Latency Impact" value={`${metrics.latencyImpact}ms`} tone="hazard" />
            <Metric icon={FileSearch} label="Scripts Found" value={metrics.totalScripts} tone="moss" />
            <Metric icon={AlertTriangle} label="Orphan Scripts" value={metrics.orphanScripts} tone="hazard" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="rounded-lg border border-line bg-white shadow-tool">
          <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Script Inventory</h2>
              <p className="text-sm text-zinc-600">Rendered HTML is matched against installed app signatures, not domain alone.</p>
            </div>
            <div className="grid grid-cols-3 rounded-md border border-line bg-panel p-1 text-sm">
              {['all', 'orphan', 'active'].map((status) => (
                <button
                  key={status}
                  className={`rounded px-3 py-1.5 capitalize ${selectedStatus === status ? 'bg-white shadow-sm' : 'text-zinc-600'}`}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-line">
            {visibleItems.map((item) => (
              <article key={item.src} className="grid gap-4 p-4 lg:grid-cols-[1fr_150px_150px] lg:items-center">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[item.status]}`}>
                      {item.status === 'orphan' ? 'Orphan script' : 'Active app'}
                    </span>
                    <span className="rounded-full border border-line bg-panel px-2 py-1 text-xs text-zinc-600">
                      {item.confidence} confidence
                    </span>
                  </div>
                  <h3 className="font-semibold">{item.appName}</h3>
                  <p className="truncate text-sm text-zinc-600">{item.src}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap size={16} className="text-hazard" />
                  <span>{item.latencyMs}ms impact</span>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-ink px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
                  disabled={item.status !== 'orphan' || item.risk === 'blocked'}
                  onClick={() => handleSafeDelete(item)}
                >
                  <Trash2 size={16} />
                  Safe Delete
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="Safety Controls" icon={ShieldCheck}>
            <SafetyRow icon={DatabaseBackup} label="Theme backup" value={`${backups.length} snapshots`} />
            <SafetyRow icon={LockKeyhole} label="Required scope" value="write_themes" />
            <SafetyRow icon={CheckCircle2} label="Liquify audit" value="Enabled in CI" />
          </Panel>

          <Panel title="Operation Log" icon={FileSearch}>
            <p className="rounded-md border border-line bg-panel p-3 text-sm text-zinc-700">{activity}</p>
          </Panel>

          <Panel title="theme.liquid Preview" icon={FileSearch}>
            <pre className="max-h-[330px] overflow-auto rounded-md bg-[#111412] p-3 text-xs leading-5 text-[#dff6d7]">
              {themeLiquid.trim()}
            </pre>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  const iconClass = tone === 'hazard' ? 'text-hazard' : tone === 'moss' ? 'text-moss' : 'text-ink';

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-600">{label}</span>
        <Icon size={18} className={iconClass} />
      </div>
      <strong className="text-3xl font-semibold">{value}</strong>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-tool">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={18} />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SafetyRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="flex items-center gap-2 text-sm text-zinc-600">
        <Icon size={16} />
        {label}
      </span>
      <strong className="text-sm">{value}</strong>
    </div>
  );
}

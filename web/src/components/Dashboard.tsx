import { useEffect, useState, type ReactNode } from 'react';
import { Activity, Coins, Boxes, ExternalLink } from 'lucide-react';
import type { Analytics, PublicReceipt, ReceiptLinks } from '../types';
import { getAnalytics, getHistory } from '../lib/api';
import { Badge, shortId } from './ui';

function tinybarsToHbar(t: string): string {
  return (Number(BigInt(t)) / 1e8).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card rounded-xl p-4">
      <div className="mb-2 flex items-center gap-2 text-white/40">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export function Dashboard({
  account,
  onOpenReceipt,
}: {
  account: string | null;
  onOpenReceipt: (id: string) => void;
}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [receipts, setReceipts] = useState<(PublicReceipt & { links: ReceiptLinks })[]>([]);
  const [mine, setMine] = useState(false);

  useEffect(() => {
    getAnalytics().then(setAnalytics).catch(() => undefined);
  }, []);

  useEffect(() => {
    getHistory(mine && account ? account : undefined)
      .then((r) => setReceipts(r.receipts))
      .catch(() => undefined);
  }, [mine, account]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Total runs"
          value={analytics ? String(analytics.totalRuns) : '—'}
        />
        <StatCard
          icon={<Boxes className="h-4 w-4" />}
          label="Active agents"
          value={analytics ? String(analytics.totalAgents) : '—'}
        />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label="HBAR volume"
          value={analytics ? `${tinybarsToHbar(analytics.hbarVolumeTinybars)} ℏ` : '—'}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Avg latency"
          value={
            analytics && analytics.byAgent.length
              ? `${Math.round(
                  analytics.byAgent.reduce((s, a) => s + a.avgDurationMs, 0) /
                    analytics.byAgent.length,
                )} ms`
              : '—'
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/90">Transaction history</h3>
        {account && (
          <div className="flex rounded-lg border border-white/10 p-0.5 text-xs">
            <button
              onClick={() => setMine(false)}
              className={`rounded-md px-3 py-1 ${!mine ? 'bg-white/10 text-white' : 'text-white/50'}`}
            >
              All
            </button>
            <button
              onClick={() => setMine(true)}
              className={`rounded-md px-3 py-1 ${mine ? 'bg-white/10 text-white' : 'text-white/50'}`}
            >
              Mine
            </button>
          </div>
        )}
      </div>

      {receipts.length === 0 ? (
        <p className="text-sm text-white/40">No runs yet. Pay an agent to create the first receipt.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs text-white/50">
              <tr>
                <th className="px-4 py-2.5 font-medium">Agent</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Result hash</th>
                <th className="px-4 py-2.5 font-medium">Proof</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {receipts.map((r) => (
                <tr key={r.id} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 text-white/80">
                    {r.agentName} {r.demo && <Badge tone="amber">demo</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-white/60">{r.company ?? '—'}</td>
                  <td className="hidden px-4 py-2.5 font-mono text-xs text-white/50 sm:table-cell">
                    {shortId(r.resultHash)}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.links.proofTx ? (
                      <a
                        href={r.links.proofTx}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:underline"
                      >
                        HCS <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => onOpenReceipt(r.id)}
                      className="text-xs font-medium text-violet-300 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

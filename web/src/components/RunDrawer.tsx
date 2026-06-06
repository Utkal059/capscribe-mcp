import { useState, type ReactNode } from 'react';
import { X, Wallet, Zap, Coins, Cpu, AlertCircle } from 'lucide-react';
import type { Agent, AppConfig, RunResponse } from '../types';
import { preparePayment, runAgent } from '../lib/api';
import { signTransferBytes } from '../lib/wallet';
import { buildPaymentHeader } from '../lib/x402';
import { AgentIcon, Spinner, Badge } from './ui';
import { ReceiptView } from './ReceiptView';

type Phase = 'form' | 'preparing' | 'signing' | 'running' | 'done' | 'error';

const PHASE_LABEL: Record<Exclude<Phase, 'form' | 'done' | 'error'>, string> = {
  preparing: 'Building x402 payment…',
  signing: 'Awaiting wallet signature…',
  running: 'Settling payment & running agent…',
};

export function RunDrawer({
  agent,
  config,
  account,
  onConnect,
  onClose,
  onCompleted,
}: {
  agent: Agent;
  config: AppConfig;
  account: string | null;
  onConnect: () => Promise<void>;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [input, setInput] = useState('');
  const [company, setCompany] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  const busy = phase === 'preparing' || phase === 'signing' || phase === 'running';

  async function payAndRun() {
    setError(null);
    try {
      let payer = account;
      if (!payer) {
        await onConnect();
        // onConnect updates parent state; re-read is via prop on next render,
        // so guard here by requiring the user to click again if still null.
        return;
      }
      setPhase('preparing');
      const { paymentRequirements, transactionBytes } = await preparePayment(agent.id, payer);
      setPhase('signing');
      const signed = await signTransferBytes(transactionBytes);
      const header = buildPaymentHeader(paymentRequirements, signed);
      setPhase('running');
      const res = await runAgent({
        agentId: agent.id,
        input: input.trim(),
        company: company.trim() || undefined,
        account: payer,
        paymentHeader: header,
      });
      setResult(res);
      setPhase('done');
      onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }

  async function demoRun() {
    setError(null);
    try {
      setPhase('running');
      const res = await runAgent({
        agentId: agent.id,
        input: input.trim(),
        company: company.trim() || undefined,
        account: account ?? undefined,
        demo: true,
      });
      setResult(res);
      setPhase('done');
      onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }

  const canSubmit = input.trim().length > 0 && !busy;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-white/10 bg-[#0b0e16] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b0e16]/95 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
              <AgentIcon name={agent.icon} className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{agent.name}</div>
              <div className="text-xs text-white/50">{agent.category}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/50 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 px-5 py-5">
          {phase === 'done' && result ? (
            <ReceiptView receipt={result.receipt} links={result.links} shareUrl={result.shareUrl} />
          ) : (
            <>
              <p className="text-sm leading-relaxed text-white/65">{agent.description}</p>

              <div className="grid grid-cols-3 gap-2">
                <Stat icon={<Coins className="h-4 w-4" />} label="Price" value={`${agent.priceHbar} ℏ`} />
                <Stat
                  icon={<Cpu className="h-4 w-4" />}
                  label="Est. AI cost"
                  value={`$${(agent.estModelCostUsdCents / 100).toFixed(2)}`}
                />
                <Stat icon={<Zap className="h-4 w-4" />} label="Network" value={config.network} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Company name (optional)</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={busy}
                  placeholder="e.g. Acme Industries Ltd"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">{agent.inputLabel}</label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={busy}
                  rows={7}
                  placeholder={agent.inputPlaceholder}
                  className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none transition focus:border-violet-400/50"
                />
              </div>

              {busy && (
                <div className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2.5 text-sm text-violet-200">
                  <Spinner />
                  {PHASE_LABEL[phase as keyof typeof PHASE_LABEL]}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  onClick={payAndRun}
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white transition enabled:hover:opacity-90 disabled:opacity-40"
                >
                  <Wallet className="h-4 w-4" />
                  {account ? `Pay ${agent.priceHbar} ℏ & run` : 'Connect wallet to pay'}
                </button>
                {config.demoEnabled && (
                  <button
                    onClick={demoRun}
                    disabled={!canSubmit}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition enabled:hover:bg-white/10 disabled:opacity-40"
                  >
                    Try demo run (no payment) <Badge tone="amber">testnet</Badge>
                  </button>
                )}
                <p className="pt-1 text-center text-[11px] text-white/40">
                  You sign only the transfer. Fees are paid by the x402 facilitator —
                  funds never move without your signature.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card rounded-lg px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-white/40">{icon}</div>
      <div className="text-[11px] text-white/40">{label}</div>
      <div className="text-sm font-semibold text-white/90">{value}</div>
    </div>
  );
}

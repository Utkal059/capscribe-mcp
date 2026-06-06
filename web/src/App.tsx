import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Wallet, LogOut, Github, Store, LayoutDashboard, ShieldCheck } from 'lucide-react';
import type { Agent, AppConfig, PublicReceipt, ReceiptLinks } from './types';
import { getAgents, getConfig, getReceipt } from './lib/api';
import { connect as connectWallet, disconnect as disconnectWallet } from './lib/wallet';
import { AgentCard } from './components/AgentCard';
import { RunDrawer } from './components/RunDrawer';
import { Dashboard } from './components/Dashboard';
import { ReceiptView } from './components/ReceiptView';
import { Spinner, shortId } from './components/ui';

type Tab = 'market' | 'dashboard';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('market');
  const [active, setActive] = useState<Agent | null>(null);
  const [shared, setShared] = useState<{ receipt: PublicReceipt; links: ReceiptLinks } | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAgents = useCallback(() => {
    getAgents()
      .then((r) => setAgents(r.agents))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    Promise.all([getConfig(), getAgents()])
      .then(([cfg, ag]) => {
        setConfig(cfg);
        setAgents(ag.agents);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  // Deep-link support for shareable result pages: /r/:id
  useEffect(() => {
    const openFromPath = () => {
      const m = window.location.pathname.match(/^\/r\/([A-Za-z0-9_-]+)$/);
      if (m) {
        getReceipt(m[1])
          .then(setShared)
          .catch(() => setShared(null));
      } else {
        setShared(null);
      }
    };
    openFromPath();
    window.addEventListener('popstate', openFromPath);
    return () => window.removeEventListener('popstate', openFromPath);
  }, []);

  const openReceipt = useCallback((id: string) => {
    window.history.pushState({}, '', `/r/${id}`);
    getReceipt(id)
      .then(setShared)
      .catch(() => setShared(null));
  }, []);

  const closeShared = () => {
    window.history.pushState({}, '', '/');
    setShared(null);
  };

  const handleConnect = useCallback(async () => {
    if (!config) return;
    if (!config.walletConnectProjectId) {
      setWalletError('Wallet connect is not configured (set WALLETCONNECT_PROJECT_ID).');
      return;
    }
    setConnecting(true);
    setWalletError(null);
    try {
      const { accountId } = await connectWallet(config.walletConnectProjectId, config.network);
      setAccount(accountId);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, [config]);

  const handleDisconnect = async () => {
    await disconnectWallet();
    setAccount(null);
  };

  if (loading || !config) {
    return (
      <div className="grid min-h-screen place-items-center text-white/60">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="aurora min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07090f]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <button onClick={closeShared} className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
            <div className="text-left">
              <div className="text-sm font-semibold tracking-tight text-white">CapScribe</div>
              <div className="text-[10px] text-white/40">AI agents · paid in HBAR · proven on Hedera</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Utkal059/capscribe-mcp"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-white sm:block"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            {account ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {shortId(account)}
                <LogOut className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {connecting ? <Spinner /> : <Wallet className="h-4 w-4" />}
                Connect wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {shared ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <button onClick={closeShared} className="text-sm text-violet-300 hover:underline">
              ← Back to marketplace
            </button>
            <div className="card rounded-2xl p-6">
              <ReceiptView receipt={shared.receipt} links={shared.links} />
            </div>
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="mb-8 text-center">
              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                x402 pay-to-run · MCP / Hedera Agent Kit · HCS proof-of-completion
              </div>
              <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Pay an AI agent in HBAR.
                <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
                  {' '}
                  Get a verifiable result.
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">
                CapScribe agents read Indian IPO filings (DRHP) and return audited capital-event
                timelines and risk reports. Payment settles via x402 and automatically triggers
                execution; every run is anchored on the Hedera Consensus Service.
              </p>
            </section>

            {/* Tabs */}
            <div className="mb-6 flex justify-center">
              <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                <TabButton active={tab === 'market'} onClick={() => setTab('market')} icon={<Store className="h-4 w-4" />}>
                  Marketplace
                </TabButton>
                <TabButton
                  active={tab === 'dashboard'}
                  onClick={() => setTab('dashboard')}
                  icon={<LayoutDashboard className="h-4 w-4" />}
                >
                  Dashboard
                </TabButton>
              </div>
            </div>

            {walletError && (
              <div className="mx-auto mb-4 max-w-xl rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
                {walletError}
              </div>
            )}

            {tab === 'market' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((a) => (
                  <AgentCard key={a.id} agent={a} onRun={setActive} />
                ))}
              </div>
            ) : (
              <Dashboard account={account} onOpenReceipt={openReceipt} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/35">
        Built with the Hedera Agent Kit · x402 · {config.network} ·{' '}
        <a href="https://github.com/Utkal059/capscribe-mcp" className="hover:text-white/60">
          source
        </a>
      </footer>

      {active && (
        <RunDrawer
          agent={active}
          config={config}
          account={account}
          onConnect={handleConnect}
          onClose={() => setActive(null)}
          onCompleted={refreshAgents}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

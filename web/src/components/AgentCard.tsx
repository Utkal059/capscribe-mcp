import { ArrowRight } from 'lucide-react';
import type { Agent } from '../types';
import { AgentIcon, Stars, Badge } from './ui';

export function AgentCard({ agent, onRun }: { agent: Agent; onRun: (a: Agent) => void }) {
  return (
    <button
      onClick={() => onRun(agent)}
      className="card group flex h-full flex-col rounded-2xl p-5 text-left transition hover:border-violet-400/40 hover:shadow-[0_0_40px_-12px_rgba(124,58,237,0.5)]"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-emerald-500/20 text-violet-200">
          <AgentIcon name={agent.icon} className="h-5 w-5" />
        </div>
        <Stars score={agent.reputation.score} />
      </div>

      <div className="mb-1 text-base font-semibold text-white">{agent.name}</div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-white/55">{agent.tagline}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge tone="green">{agent.priceHbar} ℏ</Badge>
          <span className="text-[11px] text-white/40">{agent.reputation.runs} runs</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition group-hover:gap-2">
          Run <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

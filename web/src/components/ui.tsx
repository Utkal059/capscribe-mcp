import type { ReactNode } from 'react';
import {
  Layers,
  ShieldAlert,
  Workflow,
  Bot,
  Star,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  layers: Layers,
  'shield-alert': ShieldAlert,
  workflow: Workflow,
};

export function AgentIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Bot;
  return <Icon className={className} />;
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <Loader2 className={`spin ${className}`} />;
}

export function Stars({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber-300">
      <Star className="h-3.5 w-3.5 fill-amber-300" />
      <span className="text-xs font-medium text-amber-200/90">{score.toFixed(2)}</span>
    </span>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'green' | 'amber' | 'red' | 'violet';
}) {
  const tones: Record<string, string> = {
    default: 'bg-white/8 text-white/70 border-white/10',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function severityTone(category: string): 'red' | 'amber' | 'green' | 'violet' {
  const c = category.toUpperCase();
  if (c.includes('HIGH')) return 'red';
  if (c.includes('MEDIUM')) return 'amber';
  if (c.includes('LOW')) return 'green';
  return 'violet';
}

export function shortId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

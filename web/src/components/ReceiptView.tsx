import { useState } from 'react';
import { CheckCircle2, ExternalLink, Copy, Check, ShieldCheck } from 'lucide-react';
import type { PublicReceipt, ReceiptLinks } from '../types';
import { Badge, severityTone, shortId } from './ui';

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:border-violet-400/40 hover:text-white"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

export function ReceiptView({
  receipt,
  links,
  shareUrl,
}: {
  receipt: PublicReceipt;
  links: ReceiptLinks;
  shareUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const result = receipt.result;

  const copyShare = async () => {
    const url = `${window.location.origin}${shareUrl ?? `/r/${receipt.id}`}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-emerald-300">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">Execution complete</span>
        {receipt.demo && <Badge tone="amber">demo</Badge>}
      </div>

      {/* Proof-of-completion */}
      <div className="card rounded-xl p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/90">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          Hedera proof-of-completion
        </div>
        <dl className="grid grid-cols-1 gap-2 text-xs text-white/60 sm:grid-cols-2">
          <div>
            <dt className="text-white/40">Result hash (SHA-256)</dt>
            <dd className="font-mono text-white/80">{shortId(receipt.resultHash)}</dd>
          </div>
          <div>
            <dt className="text-white/40">Payment tx</dt>
            <dd className="font-mono text-white/80">
              {receipt.demo ? 'demo run' : shortId(receipt.paymentTxId)}
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          {links.payment && <LinkPill href={links.payment} label="Payment on HashScan" />}
          {links.proofTx && <LinkPill href={links.proofTx} label="Proof message on HashScan" />}
          {links.proofTopic && <LinkPill href={links.proofTopic} label="Proof topic" />}
          <button
            onClick={copyShare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:border-violet-400/40 hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Share link'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="card rounded-xl p-4">
        <div className="mb-1 text-sm font-medium text-white/90">{result.company}</div>
        <p className="text-sm leading-relaxed text-white/70">{result.summary}</p>
      </div>

      {/* Findings */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-white/90">
          Findings <span className="text-white/40">({result.findings.length})</span>
        </div>
        {result.findings.length === 0 && (
          <p className="text-sm text-white/50">No structured findings were returned.</p>
        )}
        <div className="space-y-2">
          {result.findings.map((f, i) => (
            <div key={i} className="card rounded-lg p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge tone={severityTone(f.category)}>{f.category}</Badge>
                <span className="text-sm font-medium text-white/90">{f.title}</span>
                {f.date && <span className="text-xs text-white/40">· {f.date}</span>}
                {f.amount && <span className="text-xs text-white/40">· {f.amount}</span>}
              </div>
              <p className="text-sm text-white/65">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The marketplace agent catalog.
 *
 * Every agent here is backed by a real implementation in `engine.ts` — there are
 * no placeholder listings. Prices are in tinybars (1 HBAR = 100,000,000 tinybars).
 */
import type { AgentDefinition } from '../types';

export const AGENTS: readonly AgentDefinition[] = [
  {
    id: 'capital-events',
    name: 'DRHP Capital Events',
    tagline: 'Reconstruct a company’s entire share-capital history from its IPO filing.',
    description:
      'Reads an Indian DRHP (Draft Red Herring Prospectus) and extracts every ' +
      'capital event — allotments, bonus & rights issues, splits, ESOP grants, ' +
      'preferential allotments, conversions and authorized-capital changes — into ' +
      'a clean, dated timeline a financial analyst can audit.',
    icon: 'layers',
    priceTinybars: '50000000', // 0.5 HBAR
    category: 'IPO Due Diligence',
    inputLabel: 'DRHP text or public URL',
    inputPlaceholder:
      'Paste prospectus text, or a https:// link to the filing (e.g. SEBI/exchange PDF rendered as text)…',
    estModelCostUsdCents: 3,
  },
  {
    id: 'risk-scan',
    name: 'DRHP Risk & Red-Flags',
    tagline: 'Surface the risk factors that actually matter, ranked by severity.',
    description:
      'Scans a prospectus for material risk factors — litigation, regulatory, ' +
      'promoter/governance, financial-leverage and concentration risks — and ' +
      'returns them ranked HIGH / MEDIUM / LOW with a one-line rationale each.',
    icon: 'shield-alert',
    priceTinybars: '50000000', // 0.5 HBAR
    category: 'IPO Due Diligence',
    inputLabel: 'DRHP text or public URL',
    inputPlaceholder: 'Paste prospectus text, or a https:// link…',
    estModelCostUsdCents: 3,
  },
  {
    id: 'full-dd',
    name: 'Full Due-Diligence (Multi-Agent)',
    tagline: 'Runs Capital-Events + Risk agents and synthesises one verdict.',
    description:
      'A multi-agent workflow: the Capital-Events and Risk agents run over the ' +
      'same filing, then a synthesiser agent merges their findings into a single ' +
      'ranked report with an overall readiness note. One payment, three agents.',
    icon: 'workflow',
    priceTinybars: '100000000', // 1 HBAR
    category: 'IPO Due Diligence',
    inputLabel: 'DRHP text or public URL',
    inputPlaceholder: 'Paste prospectus text, or a https:// link…',
    estModelCostUsdCents: 7,
  },
];

const BY_ID = new Map(AGENTS.map((a) => [a.id, a]));

export function getAgent(id: string): AgentDefinition | undefined {
  return BY_ID.get(id);
}

/** Tinybars → HBAR string, e.g. "50000000" → "0.5". */
export function tinybarsToHbar(tinybars: string): string {
  const n = BigInt(tinybars);
  const whole = n / 100_000_000n;
  const frac = (n % 100_000_000n).toString().padStart(8, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

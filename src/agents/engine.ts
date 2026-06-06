/**
 * Agent execution engine.
 *
 * Each agent is a real Claude-backed analysis over a DRHP filing (supplied as
 * raw text or a public URL). The `full-dd` agent composes the other two and
 * synthesises a verdict — a genuine multi-agent workflow, no mocks.
 */
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../logger';
import { withRetry } from '../util/retry';
import type { AnalysisResult, Finding } from '../types';

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const MAX_INPUT_CHARS = 14_000;

interface PromptSpec {
  system: string;
  /** Extra guidance appended after the document. */
  schemaHint: string;
}

const SPECS: Record<'capital-events' | 'risk-scan', PromptSpec> = {
  'capital-events': {
    system:
      'You are a financial analyst specialising in Indian IPO filings (DRHP). ' +
      'Extract every capital event from the document: share allotments, bonus ' +
      'issues, rights issues, splits, ESOP grants, preferential allotments, ' +
      'conversions and authorized-capital changes.',
    schemaHint:
      'Respond ONLY with valid JSON, no markdown fences:\n' +
      '{"summary":"2-3 sentences on the capital history",' +
      '"findings":[{"category":"ALLOTMENT|BONUS|RIGHTS|SPLIT|ESOP|AUTH_CAPITAL|PREFERENTIAL|CONVERSION",' +
      '"title":"short label","detail":"one concise sentence",' +
      '"date":"YYYY-MM-DD or year or null","amount":"shares/INR as string or null"}]}',
  },
  'risk-scan': {
    system:
      'You are a risk analyst reviewing an Indian IPO prospectus (DRHP). ' +
      'Identify the material risk factors: litigation, regulatory, ' +
      'promoter/governance, financial-leverage, customer/supplier concentration ' +
      'and operational risks. Rank each by severity.',
    schemaHint:
      'Respond ONLY with valid JSON, no markdown fences:\n' +
      '{"summary":"2-3 sentences on the overall risk profile",' +
      '"findings":[{"category":"HIGH|MEDIUM|LOW","title":"risk name",' +
      '"detail":"one concise sentence on why it matters",' +
      '"date":null,"amount":null}]}',
  },
};

async function fetchInput(input: string): Promise<string> {
  if (!/^https?:\/\//i.test(input)) return input;
  const res = await withRetry(
    () =>
      fetch(input, {
        headers: { 'user-agent': 'CapScribe/1.0 (+https://capscribe.app)' },
        signal: AbortSignal.timeout(20_000),
      }),
    { label: 'fetch-drhp', retries: 2 },
  );
  if (!res.ok) throw new Error(`Failed to fetch document: HTTP ${res.status}`);
  return res.text();
}

function parseFindings(raw: string): { summary: string; findings: Finding[] } {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(slice) as {
    summary?: string;
    findings?: Finding[];
  };
  return {
    summary: parsed.summary ?? '',
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
  };
}

async function runSingle(
  agentId: 'capital-events' | 'risk-scan',
  text: string,
  company: string,
): Promise<{ summary: string; findings: Finding[] }> {
  const spec = SPECS[agentId];
  const message = await withRetry(
    () =>
      anthropic.messages.create({
        model: config.ANTHROPIC_MODEL,
        max_tokens: 2000,
        system: `${spec.system}\n\n${spec.schemaHint}`,
        messages: [
          {
            role: 'user',
            content: `Company: ${company}\n\nDOCUMENT:\n${text.slice(0, MAX_INPUT_CHARS)}`,
          },
        ],
      }),
    { label: `claude-${agentId}`, retries: 2 },
  );

  const block = message.content[0];
  const rawText = block && block.type === 'text' ? block.text : '{}';
  try {
    return parseFindings(rawText);
  } catch (err) {
    logger.warn({ err, agentId }, 'failed to parse model JSON');
    return { summary: 'The model response could not be parsed as structured data.', findings: [] };
  }
}

/** Execute one marketplace agent and return a normalized result. */
export async function runAgent(
  agentId: string,
  input: string,
  company?: string,
): Promise<AnalysisResult> {
  const companyName = company?.trim() || 'Unknown Company';
  const text = await fetchInput(input);
  const processedAt = new Date().toISOString();

  if (agentId === 'capital-events' || agentId === 'risk-scan') {
    const { summary, findings } = await runSingle(agentId, text, companyName);
    return { agentId, company: companyName, summary, findings, processedAt };
  }

  if (agentId === 'full-dd') {
    const [capital, risk] = await Promise.all([
      runSingle('capital-events', text, companyName),
      runSingle('risk-scan', text, companyName),
    ]);
    const findings: Finding[] = [
      ...capital.findings.map((f) => ({ ...f, category: `CAPITAL · ${f.category}` })),
      ...risk.findings.map((f) => ({ ...f, category: `RISK · ${f.category}` })),
    ];
    const highRisks = risk.findings.filter((f) => /high/i.test(f.category)).length;
    const verdict =
      highRisks === 0
        ? 'No HIGH-severity risks were flagged.'
        : `${highRisks} HIGH-severity risk${highRisks > 1 ? 's were' : ' was'} flagged — review before investing.`;
    return {
      agentId,
      company: companyName,
      summary: `Capital history: ${capital.summary} Risk profile: ${risk.summary} Verdict: ${verdict}`,
      findings,
      processedAt,
    };
  }

  throw new Error(`Unknown agent: ${agentId}`);
}

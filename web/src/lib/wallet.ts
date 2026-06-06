/**
 * HashPack (and any HIP-820 wallet) integration via WalletConnect.
 *
 * Connecting yields a DAppSigner. To pay, we take the server-built, frozen
 * x402 transfer, deserialize it with the Hedera SDK, have the wallet add the
 * payer's signature, and re-serialize. The user signs only their own transfer;
 * the facilitator pays fees and submits.
 */
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
} from '@hashgraph/hedera-wallet-connect';
// The wallet-connect signer is typed against the rebranded @hiero-ledger/sdk,
// so we use it here to keep transaction types compatible with DAppSigner.
import { LedgerId, Transaction } from '@hiero-ledger/sdk';
import { base64ToBytes, bytesToBase64 } from './base64';
import type { DAppSigner } from '@hashgraph/hedera-wallet-connect';

const METADATA = {
  name: 'CapScribe',
  description: 'Pay-to-run AI agents on Hedera — verifiable IPO due diligence.',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://capscribe.app',
  icons: [
    typeof window !== 'undefined'
      ? `${window.location.origin}/favicon.svg`
      : 'https://capscribe.app/favicon.svg',
  ],
};

let connector: DAppConnector | null = null;
let activeSigner: DAppSigner | null = null;

function ledgerFor(network: 'testnet' | 'mainnet'): LedgerId {
  return network === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;
}

function chainFor(network: 'testnet' | 'mainnet'): HederaChainId {
  return network === 'mainnet' ? HederaChainId.Mainnet : HederaChainId.Testnet;
}

async function ensureConnector(
  projectId: string,
  network: 'testnet' | 'mainnet',
): Promise<DAppConnector> {
  if (connector) return connector;
  const c = new DAppConnector(
    METADATA,
    ledgerFor(network),
    projectId,
    Object.values(HederaJsonRpcMethod),
    [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
    [chainFor(network)],
  );
  await c.init({ logger: 'error' });
  connector = c;
  return c;
}

export interface WalletConnection {
  accountId: string;
}

/** Open the WalletConnect modal and return the connected Hedera account. */
export async function connect(
  projectId: string,
  network: 'testnet' | 'mainnet',
): Promise<WalletConnection> {
  const c = await ensureConnector(projectId, network);
  // Reuse an existing session signer if one is already paired.
  if (c.signers.length === 0) {
    await c.openModal();
  }
  const signer = c.signers[0];
  if (!signer) throw new Error('No wallet session was established.');
  activeSigner = signer;
  return { accountId: signer.getAccountId().toString() };
}

/** Sign a frozen, base64-encoded transfer transaction with the connected wallet. */
export async function signTransferBytes(transactionBytes: string): Promise<string> {
  if (!activeSigner) throw new Error('Wallet not connected.');
  const tx = Transaction.fromBytes(base64ToBytes(transactionBytes));
  const signed = await activeSigner.signTransaction(tx);
  return bytesToBase64(signed.toBytes());
}

export async function disconnect(): Promise<void> {
  activeSigner = null;
  if (connector) {
    try {
      await connector.disconnectAll();
    } catch {
      /* ignore */
    }
  }
}

export function isConnected(): boolean {
  return activeSigner !== null;
}

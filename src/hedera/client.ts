/** Hedera SDK client + key helpers shared across the Hedera layer. */
import { Client, PrivateKey } from '@hashgraph/sdk';
import { config } from '../config';

/** Parse an operator key that may be ECDSA or ED25519, hex or DER. */
export function parsePrivateKey(raw: string): PrivateKey {
  try {
    return PrivateKey.fromStringECDSA(raw);
  } catch {
    return PrivateKey.fromStringED25519(raw);
  }
}

/** A network-only client (no operator) used purely to freeze transactions. */
export function networkClient(): Client {
  return config.HEDERA_NETWORK === 'mainnet'
    ? Client.forMainnet()
    : Client.forTestnet();
}

/** A client with the operator configured, for autonomous (server-paid) txs. */
export function operatorClient(): Client {
  const client = networkClient();
  client.setOperator(config.HEDERA_ACCOUNT_ID, parsePrivateKey(config.HEDERA_PRIVATE_KEY));
  return client;
}

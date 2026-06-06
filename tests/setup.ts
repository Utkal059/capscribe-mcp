// Shadow any real .env so config validation is deterministic in tests.
process.env.DOTENV_CONFIG_PATH = '.env.vitest.missing';
process.env.NODE_ENV = 'test';
process.env.HEDERA_NETWORK = 'testnet';
process.env.HEDERA_ACCOUNT_ID = '0.0.1001';
process.env.HEDERA_PRIVATE_KEY =
  '3030020100300706052b8104000a04220420fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';
process.env.PAYMENT_RECEIVER = '0.0.1001';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.FEE_PAYER = '0.0.7162784';
process.env.DATA_DIR = '.data-test';
process.env.DEMO_BYPASS = 'true';

# Soroban Passport Contract

Level 5 inter-contract contract for PayProof.

This contract calls the deployed PayProof contract's `get_reputation` function for a list of employers and computes an aggregate passport score.

## Build

```bash
cd contracts/soroban-passport
soroban contract build
```

## Deploy

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/soroban_passport.wasm \
  --source <TESTNET_SECRET_KEY> \
  --network testnet
```

## Invoke (example)

```bash
stellar contract invoke \
  --id <PASSPORT_CONTRACT_ID> \
  --source <TESTNET_SECRET_KEY> \
  --network testnet \
  -- get_passport \
  --payproof_contract <PAYPROOF_CONTRACT_ID> \
  --owner <STELLAR_ADDRESS> \
  --employers '["<EMPLOYER_ADDR_1>","<EMPLOYER_ADDR_2>"]'
```

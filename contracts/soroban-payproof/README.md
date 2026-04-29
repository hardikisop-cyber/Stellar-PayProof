# Soroban PayProof Contract

This crate contains the Stellar Soroban version of PayProof.

## What it does

The contract records payment proofs on-chain, stores per-employee payment history, and exposes summary data that the frontend can read back for verification.

## Core functions

- `record_payment(employee, amount, note)`
- `record_batch_payment(employees, amounts, note)`
- `get_history(employee)`
- `get_summary(employee)`

## Deploy Fast

From this directory:

```bash
cargo build --target wasm32-unknown-unknown --release
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroban_payproof.wasm \
  --source <your_testnet_secret_key> \
  --network testnet
```

Then set the deployed contract ID in the frontend env if you wire the UI to the contract.

## Notes

- This contract is separate from the Next.js frontend.
- The frontend in the repo still works with Stellar Horizon and Freighter.
- Use Stellar testnet only while developing.

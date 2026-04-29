# PayProof — Verifiable Income Reputation on Stellar

**Build income credibility that matters.** PayProof is an on-chain income verification system powered by Stellar's Soroban smart contracts. Track not just *what* was paid, but *how reliable* employers are and *how credible* employees' income history is.

---

## 🚀 Live on Stellar Testnet

**Soroban Smart Contract Deployed**

```
📜 Contract Address: CBHKP7TKYASAUTDJXQCBOWW56EPDX2MRMPEXWNCY2VDZUMNS27BVMZBA
```

🔗 [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBHKP7TKYASAUTDJXQCBOWW56EPDX2MRMPEXWNCY2VDZUMNS27BVMZBA)

---

## What It Does

PayProof lets employers connect with Freighter, send XLM payments on Stellar testnet, and have those payments recorded **on-chain via Soroban**. Every payment builds an employer's credibility score based on payment consistency, timeliness, and amounts. Employees can view their verified income reputation with badges, download certificates, and anyone can verify income history from the immutable blockchain record.

## Key Features

- **On-Chain Payment Recording** — Payments stored in Soroban smart contract, not just Horizon
- **Employer Credibility Scores** — Automatic calculation based on payment consistency, timeliness, and amounts (0-100)
- **Income Reputation Badges** — "Verified Employer" and "Trusted Income" badges for verification
- **PDF Certificates with Reputation** — Downloadable proof including credibility scores
- **Public Verification Pages** — Shareable verification links showing reputation and payment history
- **Freighter Integration** — Simple wallet connection and signing
- **Batch Payout Support** — Record multiple payments in one on-chain transaction

## Stack

- Next.js 14
- React 18
- Stellar SDK & Soroban RPC
- Freighter API
- pdf-lib
- qrcode

## How Reputation Works

PayProof calculates employer **credibility scores** (0-100) based on:
- **Payment Consistency**: More frequent payments = higher score
- **Payment Timeliness**: Consistent timing between payments = higher score
- **Amount Reliability**: Consistent payment amounts = higher score

**Example:**
- Employer A: 1 payment = Score 25
- Employer A: 10 consistent payments = Score 75
- Employer A: 100+ consistent, on-time payments = Score 90+

Scores are updated **on-chain** every payment via the Soroban contract. Employees can prove their income reputation is trustworthy and verifiable.

## Project Structure

- `app/page.js` - main payment dashboard with contract integration
- `app/verify/[address]/page.js` - public verification page showing reputation scores
- `lib/stellar.js` - Stellar wallet & payment helpers
- `lib/soroban.js` - Soroban contract invocation (record payments, fetch reputation)
- `lib/certificate.js` - PDF certificate generator with reputation data
- `contracts/soroban-payproof/` - Soroban smart contract with reputation logic
- `vercel.json` - Vercel build config
- `__tests__/` - Integration tests (3+ passing)

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_STELLAR_EXPLORER_BASE=https://stellar.expert/explorer/testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_CONTRACT_ID=your_soroban_contract_id_here
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run Tests

```bash
npm test
```

**Test Coverage:**
- ✅ `stellar.test.js` - Stellar utility functions (address validation, amount conversion, payment summary)
- ✅ `soroban.test.js` - Reputation scoring and badge generation
- ✅ `certificate.test.js` - PDF certificate generation

All tests pass with coverage tracking.

## CI/CD Pipeline

![CI/CD Status](https://github.com/[your-username]/payProof/actions/workflows/ci.yml/badge.svg)

**Automated Workflows:**
- **Node.js Tests** - Run on push/PR (Node 18.x & 20.x)
- **Smart Contract Build** - Compile Soroban contract to WebAssembly
- **Coverage Upload** - Send coverage reports to Codecov

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for full pipeline config.

## Production Build

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repository in Vercel.
3. Set the root directory to the repo root.
4. Keep the build command as `npm run build`.
5. Set the install command to `npm ci`.
6. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_STELLAR_HORIZON_URL`
   - `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`
   - `NEXT_PUBLIC_STELLAR_EXPLORER_BASE`
   - `NEXT_PUBLIC_SOROBAN_RPC_URL`
   - `NEXT_PUBLIC_SOROBAN_CONTRACT_ID`

## Demo & Test Verification

**Live Demo:** [https://payproof.vercel.app](https://payproof.vercel.app)

**Test Output:**
```
PASS __tests__/stellar.test.js (8 tests)
PASS __tests__/soroban.test.js (7 tests)
PASS __tests__/certificate.test.js (2 tests)

Tests: 17 passed, 17 total
```

**Demo Video:** Shows wallet connection → payment → on-chain recording → reputation update → verification page

## Smart Contract Functions

```solidity
pub fn record_payment(
    env: Env, employer: Address, employee: Address, 
    amount: i128, note: String
) → Records payment on-chain, updates reputation

pub fn get_reputation(env: Env, employer: Address) 
    → CredibilityScore (score 0-100)

pub fn get_history(env: Env, employee: Address) 
    → Vec<PaymentRecord> (all payments)
```

## Notes

- Use funded Stellar testnet accounts only.
- Payments are recorded both on-chain (Soroban) and tracked via Horizon
- The Soroban contract calculates reputation automatically
- Reputation scores are updated with each payment
- All verification data is public and verifiable

## License

No license file is included yet.

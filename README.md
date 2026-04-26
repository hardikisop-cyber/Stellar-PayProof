# PayProof

A polished Stellar testnet app for income verification, payment tracking, and downloadable proof certificates.

## What it does

PayProof lets an employer connect with Freighter, send XLM on Stellar testnet, and generate a shareable PDF certificate from public ledger data. Anyone can open the verification route and confirm the payment history from Horizon.

## Highlights

- Freighter wallet connection
- Native XLM payments on Stellar testnet
- Single payment flow and batch payout flow
- Public verification page for any Stellar address
- PDF income certificate generation
- Explorer links for accounts, transactions, and ledgers

## Stack

- Next.js 14
- React 18
- Stellar SDK
- Freighter API
- pdf-lib
- qrcode

## Project Structure

- `app/page.js` - main payment dashboard
- `app/verify/[address]/page.js` - public verification page
- `lib/stellar.js` - Stellar wallet, Horizon, and payment helpers
- `lib/certificate.js` - PDF certificate generator
- `vercel.json` - Vercel build config

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_STELLAR_EXPLORER_BASE=https://stellar.expert/explorer/testnet
```

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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
6. Add the Stellar env vars in Vercel project settings.

## Where to Push Code Fast

Push the application code to GitHub on `main`:

```bash
git add README.md
git commit -m "Add project README"
git push origin main
```

That is the right place for the source code.

## Where to Deploy a Smart Contract Fast

This version of PayProof does not use a Solidity smart contract anymore. Payments are native Stellar testnet transactions, so there is no contract to deploy inside this repo.

If you want an on-chain contract, deploy a Soroban contract to Stellar testnet from a separate Soroban project, then store the deployed contract ID in that project’s env config. The frontend would need to be wired to that contract separately.

## Verification Flow

1. Connect Freighter.
2. Send XLM to a Stellar testnet address.
3. Open `/verify/<stellar-address>`.
4. Review the payment history and download the certificate.

## Notes

- Use funded Stellar testnet accounts only.
- The app reads payment history from Horizon public testnet data.
- Explorer links point to Stellar Expert testnet.

## License

No license file is included yet.

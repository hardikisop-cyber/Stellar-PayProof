#!/bin/bash
set -e

# Soroban Contract Deployment Script (Bash)
# Deploys PayProof Soroban contract to Stellar testnet

# Initialize Rust environment
export RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}"
export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
export PATH="$CARGO_HOME/bin:$PATH"

SECRET_KEY="SCZTULPTD5HXQFCWBJN7KM4LIXB6KUW5OJX6UOE3E2NI6EMBFQ3CVA4G"
WASM_PATH="contracts/soroban-payproof/target/wasm32v1-none/release/soroban_payproof.wasm"
ENV_FILE=".env"

if ! command -v soroban >/dev/null 2>&1; then
  echo "📦 Installing Soroban CLI..."
  cargo install --locked soroban-cli
fi

echo "📦 Installing wasm32 target..."
rustup target add wasm32v1-none

echo "🔨 Building Soroban contract..."
cd contracts/soroban-payproof
soroban contract build
cd ../..

echo "🚀 Deploying to Stellar testnet..."
DEPLOY_OUTPUT=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$SECRET_KEY" \
  --network testnet 2>&1)
printf '%s\n' "$DEPLOY_OUTPUT"

CONTRACT_ID=$(printf '%s\n' "$DEPLOY_OUTPUT" | grep -oE 'C[A-Z2-7]{55}' | tail -1)
if [ -z "$CONTRACT_ID" ]; then
  echo "❌ Failed to parse contract ID from deploy output"
  exit 1
fi

echo "✅ Deployed contract ID: $CONTRACT_ID"

# Update .env
if grep -q "NEXT_PUBLIC_SOROBAN_CONTRACT_ID" "$ENV_FILE"; then
  sed -i "s/NEXT_PUBLIC_SOROBAN_CONTRACT_ID=.*/NEXT_PUBLIC_SOROBAN_CONTRACT_ID=$CONTRACT_ID/" "$ENV_FILE"
else
  echo "NEXT_PUBLIC_SOROBAN_CONTRACT_ID=$CONTRACT_ID" >> "$ENV_FILE"
fi

echo "✅ Updated .env with contract ID"
echo ""
echo "Next steps:"
echo "  git add .env"
echo "  git commit -m 'Deploy Soroban contract to testnet'"
echo "  git push origin main"

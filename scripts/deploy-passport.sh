#!/bin/bash
set -e

# Level 5 Passport Contract Deployment Script (Bash)
# Deploys soroban-passport contract to Stellar testnet and updates .env

export RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}"
export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
export PATH="$CARGO_HOME/bin:$PATH"

SECRET_KEY="SCZTULPTD5HXQFCWBJN7KM4LIXB6KUW5OJX6UOE3E2NI6EMBFQ3CVA4G"
WASM_PATH="contracts/soroban-passport/target-local/wasm32v1-none/release/soroban_passport.wasm"
ENV_FILE=".env"

if ! command -v soroban >/dev/null 2>&1; then
  echo "Installing Soroban CLI..."
  cargo install --locked soroban-cli
fi

echo "Installing wasm32 target..."
rustup target add wasm32v1-none

echo "Building Level 5 passport contract..."
cd contracts/soroban-passport
export CARGO_TARGET_DIR="$(pwd)/target-local"
soroban contract build
cd ../..

echo "Deploying passport contract to Stellar testnet..."
DEPLOY_OUTPUT=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$SECRET_KEY" \
  --network testnet 2>&1)
printf '%s\n' "$DEPLOY_OUTPUT"

PASSPORT_ID=$(printf '%s\n' "$DEPLOY_OUTPUT" | grep -oE 'C[A-Z2-7]{55}' | tail -1)
if [ -z "$PASSPORT_ID" ]; then
  echo "Failed to parse passport contract ID from deploy output"
  exit 1
fi

echo "Deployed passport contract ID: $PASSPORT_ID"

if grep -q "NEXT_PUBLIC_PASSPORT_CONTRACT_ID" "$ENV_FILE"; then
  sed -i "s/NEXT_PUBLIC_PASSPORT_CONTRACT_ID=.*/NEXT_PUBLIC_PASSPORT_CONTRACT_ID=$PASSPORT_ID/" "$ENV_FILE"
else
  echo "NEXT_PUBLIC_PASSPORT_CONTRACT_ID=$PASSPORT_ID" >> "$ENV_FILE"
fi

echo "Updated .env with passport contract ID"
echo ""
echo "Next steps:"
echo "  git add .env"
echo "  git commit -m 'Deploy passport contract to testnet (Level 5)'"
echo "  git push origin main"

const fs = require("fs");
const path = require("path");

async function main() {
  const PayProof = await ethers.getContractFactory("PayProof");
  const contract = await PayProof.deploy();

  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("PayProof deployed to:", deployedAddress);

  const envLocalPath = path.join(__dirname, "../.env.local");
  let envContent = "";

  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, "utf-8");
    if (envContent.includes("NEXT_PUBLIC_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_CONTRACT_ADDRESS=${deployedAddress}`,
      );
    } else {
      envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${deployedAddress}`;
    }
  } else {
    envContent = `NEXT_PUBLIC_CONTRACT_ADDRESS=${deployedAddress}`;
  }

  fs.writeFileSync(envLocalPath, envContent);
  console.log("Contract address saved to .env.local");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

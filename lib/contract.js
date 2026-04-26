import { ethers } from "ethers";

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "employee",
        type: "address",
      },
      {
        internalType: "string",
        name: "note",
        type: "string",
      },
    ],
    name: "payEmployee",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "employees",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
      {
        internalType: "string",
        name: "note",
        type: "string",
      },
    ],
    name: "batchPay",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "employee",
        type: "address",
      },
    ],
    name: "getHistory",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "employer",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "blockNumber",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "note",
            type: "string",
          },
        ],
        internalType: "struct PayProof.Payment[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "employee",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "fromTimestamp",
        type: "uint256",
      },
    ],
    name: "getSummary",
    outputs: [
      {
        internalType: "uint256",
        name: "totalAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "paymentCount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "earliestPayment",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "latestPayment",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "employer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "employee",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256",
      },
    ],
    name: "PaymentRecorded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "employer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "employee",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PaymentFailed",
    type: "event",
  },
];

export function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

export function getReadContract() {
  const provider = new ethers.JsonRpcProvider("https://testnet-rpc.monad.xyz");
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

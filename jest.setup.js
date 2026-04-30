import "@testing-library/jest-dom";

// Mock Freighter API
jest.mock("@stellar/freighter-api", () => ({
  requestAccess: jest.fn().mockResolvedValue({ address: "test-wallet" }),
  getAddress: jest.fn().mockResolvedValue("GBRPYHIL2CI3WHZSMMVAPQRAUJE45LOGO4ZSEIL5G3BICFKUJMRBTMY"),
  signTransaction: jest.fn().mockResolvedValue({
    signedTxXdr: "test-xdr",
  }),
}));

// Mock Horizon Server
jest.mock("stellar-sdk", () => {
  const actual = jest.requireActual("stellar-sdk");
  return {
    ...actual,
    Horizon: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn().mockResolvedValue({
          sequence: "1",
        }),
        submitTransaction: jest.fn().mockResolvedValue({
          hash: "test-hash",
          ledger: 123456,
        }),
        payments: jest.fn().mockReturnValue({
          forAccount: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                call: jest.fn().mockResolvedValue({
                  records: [
                    {
                      type: "payment",
                      asset_type: "native",
                      to: "GBRPYHIL2CI3WHZSMMVAPQRAUJE45LOGO4ZSEIL5G3BICFKUJMRBTMY",
                      from: "GBWYIQVTQIHHFZJBNHGQV5UJYPBDVQ35VQPPK3G4UAUHWVVYQV6TQJCN",
                      amount: "10.5",
                      transaction_hash: "test-hash",
                      ledger_attr: 123456,
                      ledger: 123456,
                      created_at: "2024-01-01T00:00:00Z",
                    },
                  ],
                }),
              }),
            }),
          }),
        }),
        transactions: jest.fn().mockReturnValue({
          transaction: jest.fn().mockReturnValue({
            call: jest.fn().mockResolvedValue({
              memo: "test memo",
            }),
          }),
        }),
      })),
    },
    rpc: {
      Server: jest.fn().mockImplementation(() => ({
        getAccount: jest.fn().mockResolvedValue({
          sequence: "1",
        }),
        sendTransaction: jest.fn().mockResolvedValue({
          hash: "rpc-tx-hash",
          status: "SUCCESS",
        }),
        getTransaction: jest.fn().mockResolvedValue({
          status: "SUCCESS",
        }),
        simulateTransaction: jest.fn().mockResolvedValue({
          results: [
            {
              result: {
                retVal: null,
              },
            },
          ],
        }),
      })),
    },
  };
});

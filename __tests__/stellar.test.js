import {
  isValidStellarAddress,
  amountToStroops,
  shortAddress,
  buildPaymentSummary,
} from "@/lib/stellar";

describe("Stellar Utilities", () => {
  describe("isValidStellarAddress", () => {
    test("should validate Stellar address format", () => {
      // Test that the function exists and is callable
      expect(typeof isValidStellarAddress).toBe("function");

      // Test with falsy values
      expect(isValidStellarAddress("")).toBe(false);
      expect(isValidStellarAddress(null)).toBe(false);
      expect(isValidStellarAddress(undefined)).toBe(false);
    });

    test("should reject invalid Stellar address", () => {
      expect(isValidStellarAddress("invalid-address")).toBe(false);
      expect(isValidStellarAddress("too-short")).toBe(false);
    });
  });

  describe("amountToStroops", () => {
    test("should convert XLM to stroops correctly", () => {
      expect(amountToStroops("1")).toBe("10000000");
      expect(amountToStroops("10.5")).toBe("105000000");
      expect(amountToStroops("0.5")).toBe("5000000");
    });

    test("should throw on invalid amounts", () => {
      expect(() => amountToStroops("0")).toThrow();
      expect(() => amountToStroops("-1")).toThrow();
      expect(() => amountToStroops("invalid")).toThrow();
    });
  });

  describe("shortAddress", () => {
    test("should shorten long addresses", () => {
      const address = "GBRPYHIL2CI3WHZSMMVAPQRAUJE45LOGO4ZSEIL5G3BICFKUJMRBTMY";
      const shortened = shortAddress(address);
      expect(shortened).toBe("GBRPYH...BTMY");
      expect(shortened.length).toBeLessThan(address.length);
    });

    test("should handle short addresses", () => {
      expect(shortAddress("abc")).toBe("abc");
      expect(shortAddress("")).toBe("");
    });
  });

  describe("buildPaymentSummary", () => {
    test("should calculate payment summary correctly", () => {
      const payments = [
        { amountXlm: 10, timestampMs: 1000, timestamp: 1 },
        { amountXlm: 5, timestampMs: 2000, timestamp: 2 },
        { amountXlm: 15, timestampMs: 3000, timestamp: 3 },
      ];

      const summary = buildPaymentSummary(payments);

      expect(summary.totalAmountXlm).toBe("30.0000000");
      expect(summary.paymentCount).toBe(3);
      expect(summary.earliestDate).toBeDefined();
      expect(summary.latestDate).toBeDefined();
    });

    test("should handle empty payments", () => {
      const summary = buildPaymentSummary([]);
      expect(summary.totalAmountXlm).toBe("0.0000000");
      expect(summary.paymentCount).toBe(0);
      expect(summary.earliestDate).toBe("N/A");
      expect(summary.latestDate).toBe("N/A");
    });
  });
});

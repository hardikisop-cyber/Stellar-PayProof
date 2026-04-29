import { getReputationBadge, isSorobanConfigured } from "@/lib/soroban";

describe("Soroban Utilities", () => {
  describe("getReputationBadge", () => {
    test("should return Elite badge for score >= 90", () => {
      expect(getReputationBadge(90)).toBe("⭐ Elite Employer");
      expect(getReputationBadge(100)).toBe("⭐ Elite Employer");
    });

    test("should return Verified badge for score 75-89", () => {
      expect(getReputationBadge(75)).toBe("✅ Verified Employer");
      expect(getReputationBadge(89)).toBe("✅ Verified Employer");
    });

    test("should return Trusted badge for score 50-74", () => {
      expect(getReputationBadge(50)).toBe("🤝 Trusted Employer");
      expect(getReputationBadge(74)).toBe("🤝 Trusted Employer");
    });

    test("should return Registered badge for score 25-49", () => {
      expect(getReputationBadge(25)).toBe("📋 Registered Employer");
      expect(getReputationBadge(49)).toBe("📋 Registered Employer");
    });

    test("should return New badge for score 1-24", () => {
      expect(getReputationBadge(1)).toBe("🆕 New Employer");
      expect(getReputationBadge(24)).toBe("🆕 New Employer");
    });

    test("should return No Reputation Data for score 0", () => {
      expect(getReputationBadge(0)).toBe("❌ No Reputation Data");
    });
  });

  describe("isSorobanConfigured", () => {
    test("should check Soroban configuration", () => {
      // Test depends on environment variables
      const configured = isSorobanConfigured();
      expect(typeof configured).toBe("boolean");
    });
  });
});

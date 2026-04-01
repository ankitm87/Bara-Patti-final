import { describe, it, expect } from "vitest";

describe("API Connection", () => {
  it("should connect to the backend API", async () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
    
    try {
      const response = await fetch(`${apiUrl}/api/health`);
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toBeDefined();
      console.log("✅ API connection successful:", apiUrl);
    } catch (error) {
      console.error("❌ API connection failed:", error);
      throw new Error(`Failed to connect to API at ${apiUrl}`);
    }
  });
});

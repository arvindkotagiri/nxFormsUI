import { describe, it, expect, beforeEach } from "vitest";
import { getStoredAuthToken, setStoredAuthToken } from "./api";

describe("auth token helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("prefers the current app token when both storage keys exist", () => {
    setStoredAuthToken("nx-token-123");
    localStorage.setItem("access_token", "legacy-token-456");

    expect(getStoredAuthToken()).toBe("nx-token-123");
  });

  it("falls back to the legacy token key for compatibility", () => {
    localStorage.setItem("access_token", "legacy-token-456");

    expect(getStoredAuthToken()).toBe("legacy-token-456");
  });
});

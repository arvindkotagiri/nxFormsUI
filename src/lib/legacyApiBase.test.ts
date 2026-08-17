import { describe, it, expect } from "vitest";
import { legacyApiUrl, parseJsonResponse } from "./legacyApiBase";

describe("legacyApiBase helpers", () => {
  it("formats legacy api url correctly with leading slashes", () => {
    const url1 = legacyApiUrl("/api/test");
    const url2 = legacyApiUrl("api/test");
    expect(url1).toContain("/api/test");
    expect(url2).toContain("/api/test");
  });

  it("parses valid JSON response", async () => {
    const mockResponse = new Response(JSON.stringify({ status: "ok", count: 42 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const data = await parseJsonResponse<{ status: string; count: number }>(mockResponse);
    expect(data).toEqual({ status: "ok", count: 42 });
  });

  it("returns null for empty response body", async () => {
    const mockResponse = new Response("", { status: 200 });
    const data = await parseJsonResponse(mockResponse);
    expect(data).toBeNull();
  });

  it("throws clear error on HTML error page response (e.g. 404 or backend down)", async () => {
    const mockResponse = new Response("<!DOCTYPE html><html><body>Cannot GET /api/test</body></html>", {
      status: 404,
    });

    await expect(parseJsonResponse(mockResponse)).rejects.toThrow(/Backend route not found/i);
  });

  it("throws clear error on invalid JSON string", async () => {
    const mockResponse = new Response("{ malformed json ", { status: 200 });
    await expect(parseJsonResponse(mockResponse)).rejects.toThrow(/Invalid JSON response/i);
  });
});

// @vitest-environment node
import { test, expect, vi, afterEach } from "vitest";
import { SignJWT } from "jose";

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import { getSession } from "../auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

async function signToken(
  payload: Record<string, unknown>,
  options: { secret?: Uint8Array; expSeconds?: number; iatSeconds?: number } = {}
) {
  const secret = options.secret ?? JWT_SECRET;
  const builder = new SignJWT(payload).setProtectedHeader({ alg: "HS256" });
  builder.setExpirationTime(
    options.expSeconds ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  );
  builder.setIssuedAt(options.iatSeconds ?? Math.floor(Date.now() / 1000));
  return await builder.sign(secret);
}

afterEach(() => {
  vi.clearAllMocks();
});

test("getSession returns null when the auth cookie is not set", async () => {
  cookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null when the cookie exists but has no value", async () => {
  cookieStore.get.mockReturnValue({});

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null when the cookie value is an empty string", async () => {
  cookieStore.get.mockReturnValue({ value: "" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns the decoded payload for a valid token", async () => {
  const token = await signToken({
    userId: "user-42",
    email: "test@example.com",
  });
  cookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-42");
  expect(session?.email).toBe("test@example.com");
});

test("getSession reads the 'auth-token' cookie", async () => {
  const token = await signToken({ userId: "u", email: "e@e.com" });
  cookieStore.get.mockReturnValue({ value: token });

  await getSession();

  expect(cookieStore.get).toHaveBeenCalledWith("auth-token");
});

test("getSession returns null when the token is signed with a different secret", async () => {
  const token = await signToken(
    { userId: "u", email: "e@e.com" },
    { secret: new TextEncoder().encode("a-different-secret") }
  );
  cookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null when the token is expired", async () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const token = await signToken(
    { userId: "u", email: "e@e.com" },
    { iatSeconds: nowSec - 3600, expSeconds: nowSec - 60 }
  );
  cookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null when the token is malformed", async () => {
  cookieStore.get.mockReturnValue({ value: "not.a.real.jwt" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null when the token's protected header is tampered with", async () => {
  const token = await signToken({ userId: "u", email: "e@e.com" });
  const [, body, sig] = token.split(".");
  // Re-encode header with alg: "none" but keep original signature → verify must fail
  const tamperedHeader = Buffer.from(
    JSON.stringify({ alg: "none" }),
    "utf-8"
  )
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  cookieStore.get.mockReturnValue({
    value: `${tamperedHeader}.${body}.${sig}`,
  });

  const session = await getSession();

  expect(session).toBeNull();
});

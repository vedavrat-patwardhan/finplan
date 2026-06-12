import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "v1:";
const SALT = "finplan-sensitive-v1";

let cachedEncryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedEncryptionKey) return cachedEncryptionKey;

  const secret = process.env.ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY or JWT_SECRET must be set for sensitive field encryption");
  }

  cachedEncryptionKey = scryptSync(secret, SALT, 32);
  return cachedEncryptionKey;
}

export function encryptSensitive(plaintext: string): string {
  if (!plaintext) return "";

  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSensitive(stored: string): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored;

  const key = getEncryptionKey();
  const payload = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return stored;

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isEncryptedValue(value: string): boolean {
  return value.startsWith(PREFIX);
}

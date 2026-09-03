// @ts-check
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { serwist } from "@serwist/next/config";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID();

/** @type {import("@serwist/next/config").SerwistConfig} */
export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/icons/icon-192.png", revision },
    { url: "/icons/icon-512.png", revision },
    { url: "/icons/icon-maskable-192.png", revision },
    { url: "/icons/icon-maskable-512.png", revision },
  ],
});

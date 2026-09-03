import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Same composition as the static public/brand/finplan-og.png (kept in sync
// by scripts/generate-brand-assets.ts), rebuilt with next/og so it always
// reflects the current copy without a manual regen step.

export const alt = "FinPlan — plan with clarity.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONTS_DIR = join(process.cwd(), "src/assets/fonts");

// Local assets don't depend on request data — read once at module scope.
// See: https://nextjs.org/docs/app/getting-started/caching#predictable-values
const [manropeExtraBold, manropeMedium, instrumentSerif, manropeExtraBoldLatinExt, markPng] =
  await Promise.all([
    readFile(join(FONTS_DIR, "Manrope-ExtraBold.woff")),
    readFile(join(FONTS_DIR, "Manrope-Medium.woff")),
    readFile(join(FONTS_DIR, "InstrumentSerif-Regular.woff")),
    // Google Fonts splits the ₹ (rupee, U+20B9) glyph into the "latin-ext"
    // unicode range, so the plain "latin" Manrope-ExtraBold.woff can't draw
    // it. Registered below as a separate "Manrope Fallback" family and
    // pinned explicitly on the ₹ span (see the money-figure JSX).
    readFile(join(FONTS_DIR, "Manrope-ExtraBold-LatinExt.woff")),
    readFile(join(process.cwd(), "public/icons/icon-192.png")),
  ]);

const markDataUri = `data:image/png;base64,${markPng.toString("base64")}`;

const COLORS = {
  black: "#0d0d0d",
  white: "#ffffff",
  lime: "#E5FE40",
  lime600: "#A0B22D",
  lime700: "#727F20",
};

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: COLORS.black,
          padding: "64px",
          fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={markDataUri} width={56} height={56} alt="" />
          <div
            style={{
              display: "flex",
              marginLeft: 16,
              fontSize: 44,
              fontWeight: 800,
              color: COLORS.white,
              letterSpacing: "-2px",
            }}
          >
            FinPlan
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 88, maxWidth: 660 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Instrument Serif",
              fontSize: 72,
              lineHeight: 1.15,
              color: COLORS.white,
            }}
          >
            <span>plan marriage, a home,</span>
            <span>and every milestone.</span>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.5)", marginTop: 30 }}>
            income · expenses · SIPs · insurance · goals — in INR.
          </div>
        </div>

        {/* Lime plunk card, right side */}
        <div style={{ display: "flex", position: "absolute", top: 185, right: 64, width: 300, height: 260 }}>
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 14,
              left: 14,
              width: "100%",
              height: "100%",
              backgroundColor: COLORS.lime700,
            }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 7,
              left: 7,
              width: "100%",
              height: "100%",
              backgroundColor: COLORS.lime600,
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: COLORS.lime,
              padding: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: "2px",
                color: COLORS.lime700,
              }}
            >
              MONTHLY SURPLUS
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 52,
                fontWeight: 800,
                color: COLORS.black,
                marginTop: 24,
                letterSpacing: "-1px",
              }}
            >
              {/* The rupee sign is explicitly pinned to the latin-ext font
                  (see the fonts array below) — satori resolves one font per
                  text node by name+weight, and doesn't merge glyph coverage
                  across two entries sharing a name, so leaving this inline
                  would silently fall through to Instrument Serif (present
                  further down the fonts list) for the whole run. */}
              <span style={{ fontFamily: "Manrope Fallback" }}>₹</span>
              <span>1,20,000</span>
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "rgba(13,13,13,0.6)", marginTop: 16 }}>
              /mo, still growing
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Manrope", data: manropeExtraBold, style: "normal", weight: 800 },
        { name: "Manrope", data: manropeMedium, style: "normal", weight: 500 },
        { name: "Manrope Fallback", data: manropeExtraBoldLatinExt, style: "normal", weight: 800 },
        { name: "Instrument Serif", data: instrumentSerif, style: "normal", weight: 400 },
      ],
    },
  );
}

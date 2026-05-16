import { ImageResponse } from "next/og";

export const alt =
  "Anthony Stolp · Greater Milwaukee Realtor · Find where you belong.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#faf8f2",
          color: "#1a1c1c",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "rgba(26, 28, 28, 0.55)",
          }}
        >
          Anthony Stolp · Realtor · Greater Milwaukee
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 124,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.02,
              color: "#1a1c1c",
            }}
          >
            Find where
          </div>
          <div
            style={{
              fontSize: 124,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.02,
              color: "#1a1c1c",
            }}
          >
            you belong.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 28,
              lineHeight: 1.5,
              color: "rgba(42, 58, 72, 0.85)",
              maxWidth: 760,
            }}
          >
            Buying or selling across Ozaukee, Washington, Waukesha, Sheboygan
            and the Greater Milwaukee area.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(26, 28, 28, 0.55)",
          }}
        >
          <div style={{ display: "flex" }}>anthonystolp.com</div>
          <div style={{ display: "flex" }}>
            ExSell Experts · Epique Realty
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

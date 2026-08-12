import { ImageResponse } from "next/og";
import { getProfile, pageTitle } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = getProfile();
  const title = pageTitle(profile);
  const tagline = profile.tagline;
  const description = profile.description || profile.bio;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 960,
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#171717",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          {tagline && (
            <div style={{ marginTop: 24, fontSize: 34, color: "#737373" }}>
              {tagline}
            </div>
          )}
          {!tagline && description && (
            <div style={{ marginTop: 24, fontSize: 34, color: "#737373" }}>
              {description}
            </div>
          )}
          <div
            style={{
              marginTop: 48,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                backgroundColor: "#171717",
              }}
            />
            <div style={{ fontSize: 24, color: "#a3a3a3", letterSpacing: "0.08em" }}>
              SIGNAL
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

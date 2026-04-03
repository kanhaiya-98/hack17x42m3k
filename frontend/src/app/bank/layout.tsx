"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

export default function ZeroBankLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ZeroBank — Smart Banking</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, fontFamily: "'Inter', system-ui, sans-serif", background: "#FFFFFF", color: "#1A1A2E" }}>
        {/* FinShield SDK running invisibly */}
        <Script src="/biometric-sdk.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}

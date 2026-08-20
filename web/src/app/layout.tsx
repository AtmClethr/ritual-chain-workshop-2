import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sans = Space_Grotesk({ subsets: ["latin"], variable: "--f-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: "Ticket Window — Ritual",
  description: "Racetrack booth on Ritual. Stamp a slip. The tape calls the race.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <Script id="till-origin" strategy="beforeInteractive">
          {`(function(){function hush(ev){var r=ev.reason;var m=typeof r==="string"?r:(r&&r.message)||"";if(String(m).indexOf("has not been authorized yet")!==-1){ev.preventDefault();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}}window.addEventListener("unhandledrejection",hush);})();`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

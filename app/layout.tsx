import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zoreva",
  description:
    "Choose shifts, confirm, and enter hours — alongside your existing factory process.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="flex min-h-full flex-col">
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html,body{background:#0a0a0a;color:#ededed}body{margin:0;min-height:100%;font-family:var(--font-geist-sans),system-ui,sans-serif}",
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

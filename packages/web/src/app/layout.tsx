import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERDwithAI",
  description: "AI-Powered ERD Design Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

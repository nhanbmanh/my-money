import type { Metadata } from "next";
import { Barlow_Semi_Condensed, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AuthShell } from "@/components/auth-shell";

const barlowSemi = Barlow_Semi_Condensed({
  variable: "--font-barlow-semi",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MyNOTE - Note my life",
  description: "Quản lý dòng tiền, tích lũy tài sản & ghi chép cuộc sống tài chính toàn diện",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${barlowSemi.variable} ${robotoCondensed.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <AuthShell>{children}</AuthShell>
        </Providers>
      </body>
    </html>
  );
}

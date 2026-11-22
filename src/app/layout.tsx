import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Next.js Shop", template: "%s — Next.js Shop" },
  description: "Учебный интернет-магазин на Next.js 16, Prisma 7, Better Auth и PostgreSQL 17.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col bg-neutral-50 antialiased">{children}</body>
    </html>
  );
}

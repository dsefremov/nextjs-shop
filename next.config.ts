import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Самодостаточная сборка для Docker: .next/standalone/server.js (Node 24).
  output: "standalone",
  poweredByHeader: false,
  // Все страницы магазина персональные (сессия, корзина) и рендерятся на запрос; Cache Components
  // и частичная предзагрузка из шаблона create-next-app 16.4 здесь не включены.
  experimental: {
    serverActions: {
      // Загрузка фото товара из /admin (до 5 МБ) идёт через server action.
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

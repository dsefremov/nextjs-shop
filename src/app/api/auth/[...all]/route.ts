import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// HTTP-API Better Auth (/api/auth/*). Формы сайта вызывают auth.api напрямую из server actions.
export const { GET, POST } = toNextJsHandler(auth);

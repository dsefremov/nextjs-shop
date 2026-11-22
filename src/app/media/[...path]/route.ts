import { readMedia } from "@/server/media";

/** Фото товаров и категорий из MEDIA_ROOT; путь проверяется (без выхода из каталога, только картинки). */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">): Promise<Response> {
  const { path } = await ctx.params;
  const file = await readMedia(path.join("/"));
  if (!file) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

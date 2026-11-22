import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog-view";
import { parseCatalogFilters } from "@/lib/filters";

export const metadata: Metadata = { title: "Каталог" };

export default async function CatalogPage({ searchParams }: PageProps<"/">) {
  return <CatalogView filters={parseCatalogFilters(await searchParams)} />;
}

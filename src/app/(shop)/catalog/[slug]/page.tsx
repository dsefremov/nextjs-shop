import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog-view";
import { parseCatalogFilters } from "@/lib/filters";
import { getCategoryBySlug } from "@/server/catalog";

export async function generateMetadata({ params }: PageProps<"/catalog/[slug]">): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  return { title: category?.name ?? "Каталог" };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/catalog/[slug]">) {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) {
    notFound();
  }
  return <CatalogView filters={parseCatalogFilters(await searchParams)} category={category} />;
}

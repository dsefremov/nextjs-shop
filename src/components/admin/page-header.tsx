import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminPageHeader({ title, addHref, addLabel }: { title: string; addHref?: string; addLabel?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1>{title}</h1>
      {addHref ? (
        <Button asChild>
          <Link href={addHref}>
            <Plus aria-hidden /> {addLabel}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

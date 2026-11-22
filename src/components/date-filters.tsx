import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateField({ id, label, value }: { id: string; label: string; value?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type="date" defaultValue={value ?? ""} className="bg-white" />
    </div>
  );
}

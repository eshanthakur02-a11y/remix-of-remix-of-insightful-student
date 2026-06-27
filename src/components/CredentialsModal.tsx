import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export type Cred = { label: string; value: string };

export function CredentialsModal({
  open, onOpenChange, title = "One-time credentials", note, creds,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  title?: string;
  note?: string;
  creds: Cred[];
}) {
  async function copyAll() {
    const text = creds.map((c) => `${c.label}: ${c.value}`).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {note ?? "These credentials are shown only once. Copy and share them with the user via a secure channel."}
        </p>
        <div className="space-y-2 mt-2">
          {creds.map((c) => (
            <div key={c.label} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className="font-mono text-sm truncate">{c.value}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.value); toast.success(`${c.label} copied`); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={copyAll}>Copy all</Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

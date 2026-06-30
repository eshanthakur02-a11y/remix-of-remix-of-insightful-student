import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Library as LibIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student/library")({ component: Page });

type Book = { id: string; title: string; isbn: string | null; available_copies: number; total_copies: number; book_categories?: { name: string } | null };
type Loan = { id: string; due_at: string; returned_at: string | null; status: string; fine_amount: number | null; books?: { title: string } | null };

function Page() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("books")
        .select("id,title,isbn,available_copies,total_copies,book_categories(name)")
        .order("title").limit(100);
      setBooks((data as never) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("book_loans")
        .select("id,due_at,returned_at,status,fine_amount,books(title)")
        .eq("borrower_user_id", user.id)
        .order("issued_at", { ascending: false });
      setLoans((data as never) ?? []);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return books.filter((b) => !s || b.title.toLowerCase().includes(s) || (b.isbn ?? "").includes(s));
  }, [books, q]);

  return (
    <>
      <PageHeader title="Library" description="Search books and view your borrow history." />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="border-0 focus-visible:ring-0" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-4 py-3">Title</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Available</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No books found.</td></tr>
              ) : filtered.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-2">{b.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.book_categories?.name ?? "—"}</td>
                  <td className="px-4 py-2"><Badge variant={b.available_copies > 0 ? "secondary" : "outline"}>{b.available_copies}/{b.total_copies}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3"><LibIcon className="h-4 w-4" /><h2 className="font-medium">My Borrow History</h2></div>
          {loans.length === 0 ? <div className="text-sm text-muted-foreground">No loans yet.</div>
          : <div className="space-y-2">
            {loans.map((l) => (
              <div key={l.id} className="border-b border-border/60 pb-2 last:border-0">
                <div className="text-sm font-medium">{l.books?.title}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Due {new Date(l.due_at).toLocaleDateString()}</span>
                  <Badge variant={l.status === "returned" ? "secondary" : "outline"}>{l.status}</Badge>
                </div>
                {l.fine_amount ? <div className="text-xs text-destructive">Fine ₹{l.fine_amount}</div> : null}
              </div>
            ))}
          </div>}
        </section>
      </div>
    </>
  );
}

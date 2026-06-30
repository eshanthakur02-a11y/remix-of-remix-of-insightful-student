import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Library as LibIcon, Plus, BookOpen, Undo2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/library")({ component: Page });

type Book = { id: string; title: string; isbn: string | null; category_id: string | null; author_id: string | null; publisher_id: string | null; total_copies: number; available_copies: number };
type Named = { id: string; name: string };
type Loan = { id: string; book_id: string; borrower_user_id: string; borrower_role: string; issued_at: string; due_at: string; returned_at: string | null; fine_amount: number; status: string };

function Page() {
  return (
    <>
      <PageHeader title="Library" description="Catalog, borrowing and fines." />
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books"><BookOpen className="h-4 w-4 mr-1" /> Books</TabsTrigger>
          <TabsTrigger value="loans">Issued / Returned</TabsTrigger>
          <TabsTrigger value="meta">Categories / Authors / Publishers</TabsTrigger>
        </TabsList>
        <TabsContent value="books"><BooksTab /></TabsContent>
        <TabsContent value="loans"><LoansTab /></TabsContent>
        <TabsContent value="meta"><MetaTab /></TabsContent>
      </Tabs>
    </>
  );
}

function BooksTab() {
  const [rows, setRows] = useState<Book[]>([]);
  const [cats, setCats] = useState<Named[]>([]);
  const [authors, setAuthors] = useState<Named[]>([]);
  const [publishers, setPublishers] = useState<Named[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const empty = { title: "", isbn: "", category_id: "", author_id: "", publisher_id: "", total_copies: "1" };
  const [form, setForm] = useState(empty);
  const [issueFor, setIssueFor] = useState<Book | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: c }, { data: a }, { data: p }] = await Promise.all([
      supabase.from("books").select("*").order("title"),
      supabase.from("book_categories").select("id,name").order("name"),
      supabase.from("book_authors").select("id,name").order("name"),
      supabase.from("book_publishers").select("id,name").order("name"),
    ]);
    setRows((b ?? []) as Book[]); setCats((c ?? []) as Named[]); setAuthors((a ?? []) as Named[]); setPublishers((p ?? []) as Named[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function startCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function startEdit(b: Book) {
    setEditing(b);
    setForm({
      title: b.title, isbn: b.isbn ?? "", category_id: b.category_id ?? "",
      author_id: b.author_id ?? "", publisher_id: b.publisher_id ?? "", total_copies: String(b.total_copies),
    });
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { data: me } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", me.user!.id).single();
    const payload = {
      school_id: prof!.school_id!, title: form.title, isbn: form.isbn || null,
      category_id: form.category_id || null, author_id: form.author_id || null, publisher_id: form.publisher_id || null,
      total_copies: Number(form.total_copies), available_copies: Number(form.total_copies),
    };
    if (editing) {
      const diff = Number(form.total_copies) - editing.total_copies;
      const { error } = await supabase.from("books").update({
        title: payload.title, isbn: payload.isbn, category_id: payload.category_id,
        author_id: payload.author_id, publisher_id: payload.publisher_id,
        total_copies: payload.total_copies, available_copies: Math.max(0, editing.available_copies + diff),
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("books").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Book added");
    }
    setOpen(false); load();
  }

  async function remove(b: Book) {
    if (!confirm(`Delete "${b.title}"?`)) return;
    const { error } = await supabase.from("books").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  }

  return (
    <>
      <DataTable<Book>
        rows={rows} loading={loading} filename="books"
        searchKeys={["title", "isbn"]}
        emptyTitle="No books yet" emptyDescription="Add your first book to the catalog."
        toolbar={<Button onClick={startCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> New book</Button>}
        columns={[
          { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "isbn", label: "ISBN" },
          { key: "category_id", label: "Category", render: (r) => cats.find((c) => c.id === r.category_id)?.name ?? "—" },
          { key: "author_id", label: "Author", render: (r) => authors.find((a) => a.id === r.author_id)?.name ?? "—" },
          { key: "copies", label: "Copies", render: (r) => <span><b>{r.available_copies}</b> / {r.total_copies}</span> },
          { key: "actions", label: "", render: (r) => (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => setIssueFor(r)} disabled={r.available_copies <= 0}>Issue</Button>
              <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          )},
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit book" : "New book"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ISBN</Label><Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div>
              <div><Label>Total copies *</Label><Input required type="number" min={1} value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Author</Label>
                <Select value={form.author_id} onValueChange={(v) => setForm({ ...form, author_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{authors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Publisher</Label>
                <Select value={form.publisher_id} onValueChange={(v) => setForm({ ...form, publisher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{publishers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <IssueDialog book={issueFor} onClose={() => { setIssueFor(null); load(); }} />
    </>
  );
}

function IssueDialog({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const [borrowers, setBorrowers] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [dueAt, setDueAt] = useState(new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!book) return;
    (async () => {
      // load both students & teachers with user_id (those who can borrow)
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from("students").select("user_id,full_name").not("user_id", "is", null),
        supabase.from("teachers").select("user_id,full_name").not("user_id", "is", null),
      ]);
      const combined = [
        ...(s ?? []).map((x: any) => ({ id: x.user_id, full_name: `${x.full_name} (student)`, role: "student" })),
        ...(t ?? []).map((x: any) => ({ id: x.user_id, full_name: `${x.full_name} (teacher)`, role: "teacher" })),
      ];
      setBorrowers(combined);
    })();
  }, [book]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!book || !userId) return;
    setBusy(true);
    const due = new Date(dueAt + "T23:59:59").toISOString();
    const { error } = await supabase.rpc("issue_book", {
      _book_id: book.id, _borrower_user_id: userId, _borrower_role: role, _due_at: due,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Book issued"); onClose();
  }

  return (
    <Dialog open={!!book} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Issue: {book?.title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Borrower *</Label>
            <Select value={userId} onValueChange={(v) => { setUserId(v); setRole(borrowers.find((b) => b.id === v)?.role as never ?? "student"); }}>
              <SelectTrigger><SelectValue placeholder="Pick a borrower" /></SelectTrigger>
              <SelectContent className="max-h-72">{borrowers.map((b) => <SelectItem key={b.id} value={b.id}>{b.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Due date *</Label><Input type="date" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || !userId}>Issue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoansTab() {
  const [rows, setRows] = useState<(Loan & { book_title?: string; borrower_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [finePerDay, setFinePerDay] = useState("5");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("book_loans").select("*,books(title),profiles!book_loans_borrower_user_id_fkey(full_name)").order("issued_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []).map((r: any) => ({ ...r, book_title: r.books?.title, borrower_name: r.profiles?.full_name })));
    setLoading(false);
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  async function returnLoan(id: string) {
    const { error } = await supabase.rpc("return_book", { _loan_id: id, _fine_per_day: Number(finePerDay) || 0 });
    if (error) return toast.error(error.message);
    toast.success("Returned"); load();
  }

  return (
    <>
      <div className="flex items-end gap-3 mb-3">
        <div><Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Fine per overdue day</Label><Input className="w-32" type="number" value={finePerDay} onChange={(e) => setFinePerDay(e.target.value)} /></div>
      </div>
      <DataTable
        rows={rows} loading={loading} filename="book-loans"
        searchKeys={["book_title", "borrower_name"]} emptyTitle="No loans"
        columns={[
          { key: "book_title", label: "Book" },
          { key: "borrower_name", label: "Borrower" },
          { key: "borrower_role", label: "Role" },
          { key: "issued_at", label: "Issued", render: (r) => new Date(r.issued_at).toLocaleDateString() },
          { key: "due_at", label: "Due", render: (r) => new Date(r.due_at).toLocaleDateString() },
          { key: "returned_at", label: "Returned", render: (r) => r.returned_at ? new Date(r.returned_at).toLocaleDateString() : "—" },
          { key: "fine_amount", label: "Fine" },
          { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "returned" ? "secondary" : "default"}>{r.status}</Badge> },
          { key: "actions", label: "", render: (r) => r.status === "issued" ? (
            <Button size="sm" variant="outline" onClick={() => returnLoan(r.id)}><Undo2 className="h-4 w-4 mr-1" /> Return</Button>
          ) : null },
        ]}
      />
    </>
  );
}

function MetaTab() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <NamedList title="Categories" table="book_categories" />
      <NamedList title="Authors" table="book_authors" />
      <NamedList title="Publishers" table="book_publishers" />
    </div>
  );
}

function NamedList({ title, table }: { title: string; table: string }) {
  const [rows, setRows] = useState<Named[]>([]);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from(table as never).select("id,name").order("name");
    setRows((data ?? []) as Named[]);
  }, [table]);
  useEffect(() => { load(); }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { data: me } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", me.user!.id).single();
    const { error } = await supabase.from(table as never).insert({ name: name.trim(), school_id: prof!.school_id } as never);
    if (error) return toast.error(error.message);
    setName(""); load();
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from(table as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  return (
    <div className="glass-card p-4">
      <h3 className="font-medium mb-3">{title}</h3>
      <form onSubmit={add} className="flex gap-2 mb-3">
        <Input placeholder="New entry" value={name} onChange={(e) => setName(e.target.value)} />
        <Button size="sm" type="submit"><Plus className="h-4 w-4" /></Button>
      </form>
      <div className="divide-y divide-border/60 text-sm">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-1.5">
            <span>{r.name}</span>
            <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        ))}
        {rows.length === 0 && <div className="py-3 text-muted-foreground text-center text-xs"><LibIcon className="h-4 w-4 mx-auto mb-1" /> Nothing yet</div>}
      </div>
    </div>
  );
}

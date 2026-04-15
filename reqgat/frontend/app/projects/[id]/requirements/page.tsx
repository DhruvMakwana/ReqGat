"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type RequirementOut } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  what_to_do: "What to Do",
  what_not_to_do: "What NOT to Do",
  what_if: "What-If",
};

const STATUS_COLORS: Record<string, "secondary" | "warning" | "success"> = {
  draft: "secondary",
  reviewed: "warning",
  final: "success",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-600",
  medium: "text-yellow-600",
  low: "text-gray-500",
};

export default function RequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [requirements, setRequirements] = useState<RequirementOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "", priority: "medium" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await api.requirements.list(id);
      setRequirements(data);
    } catch (e: any) {
      if (e.status === 401) router.push("/login");
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.category) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.requirements.update(id, editingId, form);
        setRequirements((r) => r.map((x) => x.id === editingId ? updated : x));
      } else {
        const created = await api.requirements.create(id, form);
        setRequirements((r) => [...r, created]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ title: "", description: "", category: "", priority: "medium" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (req: RequirementOut, status: string) => {
    const updated = await api.requirements.update(id, req.id, { status });
    setRequirements((r) => r.map((x) => x.id === req.id ? updated : x));
  };

  const handleDelete = async (reqId: string) => {
    if (!confirm("Delete this requirement?")) return;
    try {
      await api.requirements.delete(id, reqId);
      setRequirements((r) => r.filter((x) => x.id !== reqId));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startEdit = (req: RequirementOut) => {
    setEditingId(req.id);
    setForm({ title: req.title, description: req.description || "", category: req.category, priority: req.priority });
    setShowForm(true);
  };

  const groupedByCategory = categoriesOrder.map((cat) => ({
    cat,
    reqs: requirements.filter((r) => r.category === cat),
  }));

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <Link href={`/projects/${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Requirements</h1>
            <p className="text-muted-foreground text-sm mt-1">{requirements.length} total requirements</p>
          </div>
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: "", description: "", category: "", priority: "medium" }); }}>
            <Plus className="h-4 w-4" />
            Add Requirement
          </Button>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">{error}</p>}

        {/* Inline form */}
        {showForm && (
          <div className="border rounded-lg p-4 mb-6 bg-blue-50 space-y-3">
            <h3 className="font-medium">{editingId ? "Edit Requirement" : "New Requirement"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Requirement title" />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="what_to_do">What to Do</SelectItem>
                    <SelectItem value="what_not_to_do">What NOT to Do</SelectItem>
                    <SelectItem value="what_if">What-If</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional context..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : requirements.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-3">No requirements yet.</p>
            <Link href={`/projects/${id}/discovery`}>
              <Button variant="outline">Run AI Discovery</Button>
            </Link>
          </div>
        ) : (
          groupedByCategory.map(({ cat, reqs }) =>
            reqs.length === 0 ? null : (
              <div key={cat} className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[cat]} ({reqs.length})
                </h2>
                <div className="space-y-2">
                  {reqs.map((req) => (
                    <div key={req.id} className="border rounded-lg bg-white p-4 flex items-start gap-3">
                      <span className="text-xs font-mono text-muted-foreground pt-0.5 w-16 flex-shrink-0">{req.unique_id}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{req.title}</p>
                        {req.description && <p className="text-xs text-muted-foreground mt-0.5">{req.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>{req.priority.toUpperCase()}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{req.scenarios.filter(s => s.status === "accepted").length} scenarios</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Status cycle */}
                        <button
                          onClick={() => handleStatusChange(req, nextStatus(req.status))}
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle(req.status)}`}
                          title={`Click to advance status (${req.status})`}
                        >
                          {req.status}
                        </button>
                        <button onClick={() => startEdit(req)} className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(req.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )
        )}
      </div>
    </AppLayout>
  );
}

const categoriesOrder = ["what_to_do", "what_not_to_do", "what_if"] as const;

function nextStatus(current: string) {
  const flow = ["draft", "reviewed", "final"];
  const idx = flow.indexOf(current);
  return flow[(idx + 1) % flow.length];
}

function statusStyle(status: string) {
  return {
    draft: "bg-gray-100 border-gray-300 text-gray-600",
    reviewed: "bg-yellow-100 border-yellow-300 text-yellow-700",
    final: "bg-green-100 border-green-300 text-green-700",
  }[status] || "bg-gray-100 border-gray-300 text-gray-600";
}

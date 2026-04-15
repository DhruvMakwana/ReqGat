"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Check, X, Edit2, Plus, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, type DiscoveryResult, type DiscoveryItem } from "@/lib/api";

type ItemStatus = "pending" | "accepted" | "rejected";

interface ReviewItem extends DiscoveryItem {
  status: ItemStatus;
  editing: boolean;
}

const CATEGORY_LABELS = {
  what_to_do: { label: "What to Do", color: "bg-green-50 border-green-200", badge: "success" as const },
  what_not_to_do: { label: "What NOT to Do", color: "bg-red-50 border-red-200", badge: "destructive" as const },
  what_if: { label: "What-If Scenarios", color: "bg-yellow-50 border-yellow-200", badge: "warning" as const },
};

export default function DiscoveryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [step, setStep] = useState<"input" | "review" | "saving">("input");
  const [freeText, setFreeText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ReviewItem[]>([]);

  const handleAnalyze = async () => {
    if (!freeText.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const result: DiscoveryResult = await api.discovery.analyze(id, freeText);
      const allItems: ReviewItem[] = [
        ...result.what_to_do.map((i) => ({ ...i, status: "pending" as ItemStatus, editing: false })),
        ...result.what_not_to_do.map((i) => ({ ...i, status: "pending" as ItemStatus, editing: false })),
        ...result.what_if.map((i) => ({ ...i, status: "pending" as ItemStatus, editing: false })),
      ];
      setItems(allItems);
      setStep("review");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatus = (idx: number, status: ItemStatus) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, status } : item));
  };

  const handleEdit = (idx: number, field: "title" | "description", value: string) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const toggleEditing = (idx: number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, editing: !item.editing } : item));
  };

  const handleAddManual = (category: DiscoveryItem["category"]) => {
    setItems((prev) => [
      ...prev,
      { title: "", description: "", category, status: "accepted", editing: true },
    ]);
  };

  const handleSave = async () => {
    const accepted = items.filter((i) => i.status === "accepted" && i.title.trim());
    if (accepted.length === 0) {
      setError("Please accept at least one item before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.discovery.save(id, accepted.map(({ title, description, category }) => ({
        title, description, category,
      })));
      router.push(`/projects/${id}/requirements`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const categoriesOrder: DiscoveryItem["category"][] = ["what_to_do", "what_not_to_do", "what_if"];

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <Link href={`/projects/${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI-Powered Discovery
          </h1>
          <p className="text-muted-foreground mt-1">
            Describe your business need in plain language. AI will structure it into What to do, What not to do, and What-if scenarios.
          </p>
        </div>

        {/* Step 1: Input */}
        {step === "input" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="free-text">Describe your business requirement</Label>
              <Textarea
                id="free-text"
                placeholder={`Example: "We need a system to manage purchase orders and sales invoices for our distribution company. The system should handle multiple warehouses and support partial deliveries."`}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={6}
                className="text-base"
              />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
            <Button onClick={handleAnalyze} disabled={analyzing || !freeText.trim()} size="lg">
              {analyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Analyzing with AI...</>
              ) : (
                <><Sparkles className="h-4 w-4" />Analyze Requirements</>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Review */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Review AI Suggestions</h2>
                <p className="text-sm text-muted-foreground">Accept, reject, or edit each item. You can also add manual items.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep("input"); setItems([]); }}>
                  Re-analyze
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4" />Save Accepted</>
                  )}
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

            {/* Summary bar */}
            <div className="flex gap-4 text-sm">
              <span className="text-green-700">{items.filter(i => i.status === "accepted").length} accepted</span>
              <span className="text-red-700">{items.filter(i => i.status === "rejected").length} rejected</span>
              <span className="text-yellow-700">{items.filter(i => i.status === "pending").length} pending</span>
            </div>

            {categoriesOrder.map((category) => {
              const meta = CATEGORY_LABELS[category];
              const catItems = items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category === category);
              return (
                <div key={category} className={`border rounded-lg p-4 ${meta.color}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{meta.label}</h3>
                    <Button variant="outline" size="sm" onClick={() => handleAddManual(category)}>
                      <Plus className="h-3 w-3" />
                      Add manually
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {catItems.map(({ item, idx }) => (
                      <div key={idx} className={`bg-white rounded-md border p-3 transition-opacity ${item.status === "rejected" ? "opacity-50" : ""}`}>
                        {item.editing ? (
                          <div className="space-y-2">
                            <Input
                              value={item.title}
                              onChange={(e) => handleEdit(idx, "title", e.target.value)}
                              placeholder="Title"
                              className="text-sm"
                            />
                            <Input
                              value={item.description || ""}
                              onChange={(e) => handleEdit(idx, "description", e.target.value)}
                              placeholder="Description (optional)"
                              className="text-sm"
                            />
                            <Button size="sm" variant="outline" onClick={() => toggleEditing(idx)}>
                              Done
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{item.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                              {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => toggleEditing(idx)} className="p-1 rounded hover:bg-gray-100 text-muted-foreground">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleStatus(idx, "accepted")} className={`p-1 rounded hover:bg-green-100 ${item.status === "accepted" ? "text-green-600 bg-green-100" : "text-muted-foreground"}`}>
                                <Check className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleStatus(idx, "rejected")} className={`p-1 rounded hover:bg-red-100 ${item.status === "rejected" ? "text-red-600 bg-red-100" : "text-muted-foreground"}`}>
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {catItems.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No items in this category.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

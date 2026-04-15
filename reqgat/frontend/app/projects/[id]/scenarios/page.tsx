"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Check, X, Edit2, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type RequirementOut, type ScenarioOut } from "@/lib/api";

type ScenarioType = "edge_case" | "exception" | "conditional";
const SCENARIO_TYPES: ScenarioType[] = ["edge_case", "exception", "conditional"];
const SCENARIO_LABELS: Record<ScenarioType, string> = {
  edge_case: "Edge Case",
  exception: "Exception",
  conditional: "Conditional",
};

const STATUS_STYLES = {
  pending: "bg-yellow-50 border-yellow-200 text-yellow-800",
  accepted: "bg-green-50 border-green-200 text-green-800",
  rejected: "bg-red-50 border-red-200 text-red-800 opacity-60",
};

export default function ScenariosPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [requirements, setRequirements] = useState<RequirementOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingScenario, setEditingScenario] = useState<{ reqId: string; scId: string; text: string } | null>(null);

  const load = async () => {
    try {
      const data = await api.requirements.list(id);
      setRequirements(data.filter((r) => r.category === "what_to_do"));
    } catch (e: any) {
      if (e.status === 401) router.push("/login");
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleGenerate = async (reqId: string) => {
    setGeneratingFor(reqId);
    setError("");
    try {
      const scenarios = await api.scenarios.generate(reqId);
      setRequirements((reqs) =>
        reqs.map((r) => r.id === reqId ? { ...r, scenarios: [...r.scenarios, ...scenarios] } : r)
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleScenarioStatus = async (reqId: string, scId: string, status: string) => {
    const updated = await api.scenarios.update(reqId, scId, { status });
    setRequirements((reqs) =>
      reqs.map((r) =>
        r.id === reqId
          ? { ...r, scenarios: r.scenarios.map((s) => s.id === scId ? updated : s) }
          : r
      )
    );
  };

  const handleScenarioEdit = async (reqId: string, scId: string, description: string) => {
    const updated = await api.scenarios.update(reqId, scId, { description });
    setRequirements((reqs) =>
      reqs.map((r) =>
        r.id === reqId
          ? { ...r, scenarios: r.scenarios.map((s) => s.id === scId ? updated : s) }
          : r
      )
    );
    setEditingScenario(null);
  };

  const handleDeleteScenario = async (reqId: string, scId: string) => {
    await api.scenarios.delete(reqId, scId);
    setRequirements((reqs) =>
      reqs.map((r) =>
        r.id === reqId ? { ...r, scenarios: r.scenarios.filter((s) => s.id !== scId) } : r
      )
    );
  };

  const totalReqs = requirements.length;
  const covered = requirements.filter((r) => r.scenarios.some((s) => s.status === "accepted")).length;

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <Link href={`/projects/${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Scenario Coverage</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {covered}/{totalReqs} requirements have accepted scenarios
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Only <strong>What to Do</strong> requirements generate scenarios
          </div>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : requirements.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-3">No &quot;What to Do&quot; requirements found.</p>
            <Link href={`/projects/${id}/requirements`}>
              <Button variant="outline">Go to Requirements</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Coverage Matrix */}
            <div className="mb-8 overflow-x-auto">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Coverage Matrix</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left font-medium w-48">Requirement</th>
                    {SCENARIO_TYPES.map((t) => (
                      <th key={t} className="border p-2 text-center font-medium">{SCENARIO_LABELS[t]}</th>
                    ))}
                    <th className="border p-2 text-center font-medium">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req) => {
                    const byType = (type: ScenarioType) =>
                      req.scenarios.filter((s) => s.type === type);
                    const acceptedCount = req.scenarios.filter((s) => s.status === "accepted").length;
                    return (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="border p-2">
                          <span className="font-mono text-xs text-muted-foreground">{req.unique_id}</span>
                          <p className="text-xs line-clamp-1">{req.title}</p>
                        </td>
                        {SCENARIO_TYPES.map((type) => {
                          const scenarios = byType(type);
                          const hasAccepted = scenarios.some((s) => s.status === "accepted");
                          return (
                            <td key={type} className="border p-2 text-center">
                              {scenarios.length === 0 ? (
                                <span className="text-gray-300">—</span>
                              ) : hasAccepted ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700">
                                  <Check className="h-3 w-3" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                                  {scenarios.length}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border p-2 text-center">
                          <span className={`text-xs font-medium ${acceptedCount > 0 ? "text-green-700" : "text-red-600"}`}>
                            {acceptedCount} accepted
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Per-requirement scenario cards */}
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Scenario Details</h2>
            <div className="space-y-4">
              {requirements.map((req) => (
                <div key={req.id} className="border rounded-lg bg-white">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div>
                      <span className="text-xs font-mono text-muted-foreground">{req.unique_id}</span>
                      <p className="font-medium">{req.title}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerate(req.id)}
                      disabled={generatingFor === req.id}
                    >
                      {generatingFor === req.id ? (
                        <><Loader2 className="h-3 w-3 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="h-3 w-3" />Generate</>
                      )}
                    </Button>
                  </div>
                  <div className="p-4">
                    {req.scenarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No scenarios yet. Click Generate to use AI.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {SCENARIO_TYPES.map((type) => {
                          const typedScenarios = req.scenarios.filter((s) => s.type === type);
                          return (
                            <div key={type}>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">{SCENARIO_LABELS[type]}</p>
                              <div className="space-y-1.5">
                                {typedScenarios.map((sc) => (
                                  <div key={sc.id} className={`border rounded p-2 text-xs ${STATUS_STYLES[sc.status as keyof typeof STATUS_STYLES]}`}>
                                    {editingScenario?.scId === sc.id ? (
                                      <div className="space-y-1">
                                        <Input
                                          value={editingScenario.text}
                                          onChange={(e) => setEditingScenario({ ...editingScenario, text: e.target.value })}
                                          className="text-xs h-7"
                                        />
                                        <div className="flex gap-1">
                                          <button onClick={() => handleScenarioEdit(req.id, sc.id, editingScenario.text)} className="text-green-700 hover:underline">Save</button>
                                          <button onClick={() => setEditingScenario(null)} className="text-muted-foreground hover:underline">Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start justify-between gap-1">
                                        <p className="flex-1">{sc.description}</p>
                                        <div className="flex gap-0.5 flex-shrink-0">
                                          <button onClick={() => setEditingScenario({ reqId: req.id, scId: sc.id, text: sc.description })} className="hover:text-blue-600">
                                            <Edit2 className="h-3 w-3" />
                                          </button>
                                          <button onClick={() => handleScenarioStatus(req.id, sc.id, sc.status === "accepted" ? "pending" : "accepted")} className="hover:text-green-600">
                                            <Check className="h-3 w-3" />
                                          </button>
                                          <button onClick={() => handleScenarioStatus(req.id, sc.id, "rejected")} className="hover:text-red-600">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {typedScenarios.length === 0 && (
                                  <p className="text-xs text-muted-foreground italic">None</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

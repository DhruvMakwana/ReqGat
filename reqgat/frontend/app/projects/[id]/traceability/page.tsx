"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Link2 } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type RequirementOut, type TaskOut } from "@/lib/api";

export default function TraceabilityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [requirements, setRequirements] = useState<RequirementOut[]>([]);
  const [tasks, setTasks] = useState<Record<string, TaskOut[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: "", external_ref: "" });

  const load = async () => {
    try {
      const reqs = await api.requirements.list(id);
      setRequirements(reqs);
      // Load tasks for all requirements in parallel
      const taskMap: Record<string, TaskOut[]> = {};
      await Promise.all(
        reqs.map(async (req) => {
          taskMap[req.id] = await api.tasks.list(req.id);
        })
      );
      setTasks(taskMap);
    } catch (e: any) {
      if (e.status === 401) router.push("/login");
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddTask = async (reqId: string) => {
    if (!newTask.title.trim()) return;
    try {
      const task = await api.tasks.create(reqId, {
        title: newTask.title,
        external_ref: newTask.external_ref || undefined,
      });
      setTasks((t) => ({ ...t, [reqId]: [...(t[reqId] || []), task] }));
      setAddingFor(null);
      setNewTask({ title: "", external_ref: "" });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteTask = async (reqId: string, taskId: string) => {
    await api.tasks.delete(reqId, taskId);
    setTasks((t) => ({ ...t, [reqId]: (t[reqId] || []).filter((x) => x.id !== taskId) }));
  };

  const totalTasks = Object.values(tasks).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <Link href={`/projects/${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Traceability Matrix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Link requirements to implementation tasks. {totalTasks} tasks linked across {requirements.length} requirements.
          </p>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : requirements.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No requirements yet.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium w-32">Req ID</th>
                  <th className="text-left p-3 font-medium">Requirement</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Linked Tasks</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requirements.map((req) => {
                  const reqTasks = tasks[req.id] || [];
                  const isAdding = addingFor === req.id;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{req.unique_id}</span>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-sm">{req.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{req.status}</p>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-muted-foreground">{req.category.replace(/_/g, " ")}</span>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {reqTasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 group">
                              <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                                {task.title}
                                {task.external_ref && <span className="ml-1 text-blue-500">({task.external_ref})</span>}
                              </span>
                              <button
                                onClick={() => handleDeleteTask(req.id, task.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {isAdding ? (
                            <div className="flex items-center gap-1 mt-1">
                              <Input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="Task name"
                                className="h-7 text-xs w-32"
                              />
                              <Input
                                value={newTask.external_ref}
                                onChange={(e) => setNewTask({ ...newTask, external_ref: e.target.value })}
                                placeholder="Ref (e.g. JIRA-123)"
                                className="h-7 text-xs w-28"
                              />
                              <button onClick={() => handleAddTask(req.id)} className="text-green-600 hover:underline text-xs">Add</button>
                              <button onClick={() => { setAddingFor(null); setNewTask({ title: "", external_ref: "" }); }} className="text-muted-foreground hover:underline text-xs">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingFor(req.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                            >
                              <Plus className="h-3 w-3" />
                              Add task
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

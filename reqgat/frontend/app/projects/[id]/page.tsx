"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Wand2, List, GitBranch, FileText, Link2, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { api, type ProjectOut } from "@/lib/api";

const tabs = [
  { label: "Discovery", href: "discovery", icon: Wand2, desc: "Analyze requirements with AI" },
  { label: "Requirements", href: "requirements", icon: List, desc: "Manage requirement records" },
  { label: "Scenarios", href: "scenarios", icon: GitBranch, desc: "Review scenario coverage" },
  { label: "Documents", href: "documents", icon: FileText, desc: "Generate BRD & FRD" },
  { label: "Traceability", href: "traceability", icon: Link2, desc: "Map requirements to tasks" },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects.get(id).then(setProject).catch((e) => {
      if (e.status === 401) router.push("/login");
      else if (e.status === 404) router.push("/dashboard");
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span>/</span>
            <span>{project?.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {project?.domain_type}
            </span>
            <span className="text-sm text-muted-foreground">{project?.requirement_count} requirements</span>
          </div>
          {project?.description && (
            <p className="text-muted-foreground mt-2">{project.description}</p>
          )}
        </div>

        {/* Workflow tabs */}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Project Workflow
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={`/projects/${id}/${tab.href}`}>
                <div className="group flex flex-col gap-2 p-4 border rounded-lg bg-white hover:border-primary hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {i + 1}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tab.label}</p>
                    <p className="text-xs text-muted-foreground">{tab.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Download, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface GeneratedDoc {
  type: string;
  format: string;
}

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<GeneratedDoc[]>([]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const result = await api.documents.generate(id);
      setGenerated(result.documents);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (docType: string, format: string) => {
    const url = api.documents.downloadUrl(id, docType, format);
    const token = typeof window !== "undefined" ? localStorage.getItem("reqgat_token") : "";
    // Open in new tab with auth header via fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${docType.toUpperCase()}.${format}`;
        a.click();
      });
  };

  const docCards = [
    {
      type: "brd",
      title: "Business Requirement Document",
      desc: "Project overview, objectives, scope definitions, and high-level requirements table.",
      icon: "📋",
    },
    {
      type: "frd",
      title: "Functional Requirement Document",
      desc: "Detailed requirements with scenario definitions, conditional logic, and exception handling.",
      icon: "📄",
    },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <Link href={`/projects/${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Document Generation
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate professional BRD and FRD documents from your finalized requirements.
          </p>
        </div>

        {/* Pre-requisites */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
          <p className="font-medium text-blue-900 mb-1">Before generating:</p>
          <ul className="text-blue-800 space-y-0.5 list-disc list-inside">
            <li>All requirements must be in &quot;reviewed&quot; or &quot;final&quot; status</li>
            <li>Every &quot;What to Do&quot; requirement must have at least 1 accepted scenario</li>
          </ul>
        </div>

        <div className="mb-6">
          <Button onClick={handleGenerate} disabled={generating} size="lg">
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generating Documents...</>
            ) : (
              <><FileText className="h-4 w-4" />Generate BRD & FRD</>
            )}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-md mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {generated.length > 0 && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">Documents generated successfully!</p>
          </div>
        )}

        {/* Document cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docCards.map(({ type, title, desc, icon }) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>{icon}</span>
                  {title}
                </CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(type, "docx")}
                    disabled={generated.length === 0}
                  >
                    <Download className="h-3.5 w-3.5" />
                    .docx
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(type, "pdf")}
                    disabled={generated.length === 0}
                  >
                    <Download className="h-3.5 w-3.5" />
                    .pdf
                  </Button>
                </div>
                {generated.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Generate documents first to enable downloads.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

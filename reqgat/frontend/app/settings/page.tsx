"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Key, Loader2, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type TenantOut } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    ai_provider: "",
    api_key_claude: "",
    api_key_openai: "",
  });

  useEffect(() => {
    api.settings.get()
      .then((data) => {
        setTenant(data);
        setForm((f) => ({ ...f, ai_provider: data.ai_provider }));
      })
      .catch((e) => { if (e.status === 401) router.push("/login"); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const body: Record<string, string> = { ai_provider: form.ai_provider };
      if (form.api_key_claude) body.api_key_claude = form.api_key_claude;
      if (form.api_key_openai) body.api_key_openai = form.api_key_openai;
      const updated = await api.settings.update(body);
      setTenant(updated);
      setSuccess(true);
      setForm((f) => ({ ...f, api_key_claude: "", api_key_openai: "" }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your AI provider. Your API keys are encrypted and stored securely.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              AI Provider (BYOK)
            </CardTitle>
            <CardDescription>
              Bring your own API key. ReqGat uses your key to call the AI — you control costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Status */}
            {tenant && (
              <div className="flex gap-4 text-sm p-3 bg-gray-50 rounded-md">
                <span>Claude key: <strong className={tenant.has_claude_key ? "text-green-600" : "text-red-500"}>{tenant.has_claude_key ? "✓ Set" : "Not set"}</strong></span>
                <span>OpenAI key: <strong className={tenant.has_openai_key ? "text-green-600" : "text-red-500"}>{tenant.has_openai_key ? "✓ Set" : "Not set"}</strong></span>
                <span>Active: <strong className="text-primary capitalize">{tenant.ai_provider}</strong></span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Active AI Provider</Label>
              <Select
                value={form.ai_provider}
                onValueChange={(v) => setForm({ ...form, ai_provider: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                  <SelectItem value="openai">GPT-4o (OpenAI)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claude-key">Anthropic API Key</Label>
              <Input
                id="claude-key"
                type="password"
                placeholder={tenant?.has_claude_key ? "••••••••••••••••••• (already set)" : "sk-ant-..."}
                value={form.api_key_claude}
                onChange={(e) => setForm({ ...form, api_key_claude: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder={tenant?.has_openai_key ? "••••••••••••••••••• (already set)" : "sk-..."}
                value={form.api_key_openai}
                onChange={(e) => setForm({ ...form, api_key_openai: e.target.value })}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
            {success && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Settings saved successfully!
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

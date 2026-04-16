"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

const FREE_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.co.in", "hotmail.com", "outlook.com",
  "aol.com", "icloud.com", "mail.com", "protonmail.com", "zoho.com",
  "yandex.com", "gmx.com", "live.com", "me.com", "msn.com",
  "rediffmail.com",
]);

function isCorporateEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && !FREE_DOMAINS.has(domain);
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return /^\+\d{1,3}\d{6,14}$/.test(cleaned);
}

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One digit", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    tenant_name: "",
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirm_password: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, pass: r.test(form.password) })),
    [form.password]
  );

  const allRulesPass = ruleResults.every((r) => r.pass);
  const passwordsMatch = form.password === form.confirm_password && form.confirm_password.length > 0;
  const emailValid = form.email.includes("@") && isCorporateEmail(form.email);
  const phoneValid = isValidPhone(form.phone_number);
  const canSubmit =
    form.tenant_name.trim() !== "" &&
    form.full_name.trim() !== "" &&
    emailValid &&
    phoneValid &&
    allRulesPass &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.auth.register(form);
      saveAuth(data);
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold text-primary">ReqGat</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Set up your organization workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant_name">Organization Name</Label>
                <Input
                  id="tenant_name"
                  placeholder="Acme Corp"
                  value={form.tenant_name}
                  onChange={set("tenant_name")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="John Smith"
                  value={form.full_name}
                  onChange={set("full_name")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={set("email")}
                  required
                />
                {form.email.includes("@") && !emailValid && (
                  <p className="text-xs text-red-500 flex items-center gap-1.5">
                    <X className="h-3 w-3" /> Please use a corporate email address
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="+911234567890"
                  value={form.phone_number}
                  onChange={set("phone_number")}
                  required
                />
                {form.phone_number.length > 0 && !phoneValid && (
                  <p className="text-xs text-red-500 flex items-center gap-1.5">
                    <X className="h-3 w-3" /> Must include country code (e.g. +911234567890)
                  </p>
                )}
                {phoneValid && (
                  <p className="text-xs text-green-700 flex items-center gap-1.5">
                    <Check className="h-3 w-3" /> Valid phone number
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set("password")}
                  required
                />
                {form.password.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {ruleResults.map((r) => (
                      <li key={r.label} className="flex items-center gap-1.5 text-xs">
                        {r.pass ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-red-500" />
                        )}
                        <span className={r.pass ? "text-green-700" : "text-muted-foreground"}>
                          {r.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm_password}
                  onChange={set("confirm_password")}
                  required
                />
                {form.confirm_password.length > 0 && (
                  <p className={`text-xs flex items-center gap-1.5 ${passwordsMatch ? "text-green-700" : "text-red-500"}`}>
                    {passwordsMatch ? (
                      <><Check className="h-3 w-3" /> Passwords match</>
                    ) : (
                      <><X className="h-3 w-3" /> Passwords do not match</>
                    )}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={!canSubmit || loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

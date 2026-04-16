"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, Briefcase, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { isAuthenticated, getUser, saveAuth } from "@/lib/auth";

const USER_TYPES = [
  {
    value: "service_provider",
    label: "Service Provider",
    description: "You offer services and gather requirements from clients",
    icon: Briefcase,
  },
  {
    value: "service_consumer",
    label: "Service Consumer",
    description: "You need services and want to communicate your requirements",
    icon: ShoppingCart,
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const updated = await api.auth.updateUserType({ user_type: selected });
      const existing = getUser();
      if (existing) {
        saveAuth({ ...existing, user_type: updated.user_type });
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold text-primary">ReqGat</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">How will you use ReqGat?</h1>
          <p className="text-muted-foreground mt-1">Select the option that best describes you</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {USER_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selected === type.value;
            return (
              <Card
                key={type.value}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected
                    ? "ring-2 ring-primary border-primary"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelected(type.value)}
              >
                <CardContent className="p-6 text-center">
                  <Icon className={`h-10 w-10 mx-auto mb-3 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <h3 className="font-semibold mb-1">{type.label}</h3>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">
            {error}
          </p>
        )}

        <Button
          className="w-full"
          disabled={!selected || loading}
          onClick={handleContinue}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </div>
  );
}

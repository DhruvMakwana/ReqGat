"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { api } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    api.auth.me().then((user) => {
      router.replace(user.user_type ? "/dashboard" : "/onboarding");
    }).catch(() => {
      router.replace("/login");
    });
  }, [router]);
  return null;
}

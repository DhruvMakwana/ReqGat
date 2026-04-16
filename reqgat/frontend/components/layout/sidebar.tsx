"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, getUser } from "@/lib/auth";

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const adminNavItems = [
  { href: "/network", label: "Network", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <aside className="w-64 border-r bg-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <Zap className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-primary">ReqGat</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {[...baseNavItems, ...(user?.role === "admin" ? adminNavItems : [])].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">
          {user?.full_name}
          <span className="ml-1 text-primary capitalize">({user?.role})</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

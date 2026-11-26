"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-11 h-11 md:w-9 md:h-9 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-9 md:w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
      aria-label="Toggle tema gelap / terang"
      title={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 transition-transform -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}

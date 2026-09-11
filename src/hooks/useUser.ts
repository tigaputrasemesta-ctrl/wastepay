"use client";

import { useState, useEffect } from "react";

type User = {
  id: number;
  email: string;
  nama: string;
  role: string;
};

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          setUser(await res.json());
        } else {
          // Jika sesi tidak ditemukan (cookie dropped di APK), coba silent restore
          const savedToken =
            typeof window !== "undefined"
              ? localStorage.getItem("wp_mobile_token")
              : null;
          if (savedToken) {
            const restore = await fetch("/api/auth/mobile-restore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: savedToken }),
            });
            if (restore.ok) {
              const data = await restore.json();
              if (data.token) {
                localStorage.setItem("wp_mobile_token", data.token);
              }
              setUser(data.user);
              return;
            }
          }
        }
      } catch {
        // Not logged in
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  return { user, loading };
}

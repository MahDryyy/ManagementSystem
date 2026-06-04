"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginMascot from "@/components/ui/LoginMascot";
import Aurora from "@/components/ui/Aurora";

export default function LoginPage() {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login gagal"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8 sm:px-6">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center sm:mb-8">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            AMPEL{" "}
            <span className="text-cyan-600">GADING</span>
          </h1>

          <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.22em] text-zinc-400 sm:text-xs">
            Medical Centre
          </p>

          <p className="mt-3 text-sm text-zinc-500">
            Masuk ke sistem manajemen
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <LoginMascot
            username={username}
            usernameFocused={usernameFocused}
            passwordFocused={passwordFocused}
          />

          <form
            onSubmit={handleSubmit}
            className="space-y-4 px-6 pt-5 pb-7 sm:px-8 sm:pb-8"
          >
            <div>
              <label
                htmlFor="login-username"
                className="text-xs font-medium text-zinc-500"
              >
                Username
              </label>

              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onFocus={() => {
                  setUsernameFocused(true);
                  setPasswordFocused(false);
                }}
                onBlur={() => setUsernameFocused(false)}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="text-xs font-medium text-zinc-500"
              >
                Password
              </label>

              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onFocus={() => {
                  setPasswordFocused(true);
                  setUsernameFocused(false);
                }}
                onBlur={() => setPasswordFocused(false)}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

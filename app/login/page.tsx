"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justOnboarded = params.get("onboarded") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ivory px-6">
      <div className="w-full max-w-sm bg-white/60 rounded-2xl shadow-sm border border-plum/10 p-8">
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
        <p className="mt-1 text-sm text-plum/60">Sign in to your workspace</p>

        {justOnboarded && (
          <p className="mt-4 text-sm text-emerald-dark bg-emerald/10 rounded-lg px-3 py-2">
            Workspace created. Sign in with the admin account you just set up.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-plum">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-plum">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-plum text-ivory rounded-lg py-2.5 font-medium hover:bg-plum-deep transition disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-plum/60">
          New institution?{" "}
          <a href="/onboarding" className="text-emerald-dark font-medium">
            Set up a workspace
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

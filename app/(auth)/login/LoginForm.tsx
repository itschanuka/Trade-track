"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type LoginFormProps = {
  notice?: string;
};

export function LoginForm({ notice }: LoginFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: "/api/auth/post-login"
    });

    setIsSubmitting(false);

    if (!result?.ok) {
      setError("Invalid email or password.");
      return;
    }

    window.location.assign(result.url ?? "/api/auth/post-login");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {notice ? (
        <p className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">
          {notice}
        </p>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-800" htmlFor="email">
          Email
        </label>
        <input
          className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          id="email"
          name="email"
          required
          type="email"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-800" htmlFor="password">
          Password
        </label>
        <input
          className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          id="password"
          name="password"
          required
          type="password"
          autoComplete="current-password"
        />
      </div>
      <button
        className="w-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Logging in..." : "Log in"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

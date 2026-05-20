"use client";

import Link from "next/link";
import { useState } from "react";

type ResetPasswordFormProps = {
  token?: string;
};

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: ""
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setFormState({ status: "error", message: "Invalid or expired reset link." });
      return;
    }

    setFormState({ status: "submitting", message: "" });
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: formData.get("password")
      })
    });

    const data = (await response.json()) as { message?: string; error?: string };

    setFormState({
      status: response.ok ? "success" : "error",
      message: data.message ?? data.error ?? "We could not process that request."
    });
  }

  if (formState.status === "success") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-700" role="status">
          {formState.message}
        </p>
        <Link className="block bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white" href="/login">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-800" htmlFor="password">
          New password
        </label>
        <input
          className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          id="password"
          name="password"
          required
          minLength={12}
          type="password"
          autoComplete="new-password"
        />
      </div>
      <button
        className="w-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={formState.status === "submitting" || !token}
        type="submit"
      >
        {formState.status === "submitting" ? "Saving..." : "Save new password"}
      </button>
      {formState.message || !token ? (
        <p className="text-sm text-red-700" role="alert">
          {formState.message || "Invalid or expired reset link."}
        </p>
      ) : null}
    </form>
  );
}

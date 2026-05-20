"use client";

import { useState } from "react";

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

export function SignupForm() {
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: ""
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "submitting", message: "" });

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    const data = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setFormState({
        status: "error",
        message: data.error ?? "We could not process that request."
      });
      return;
    }

    setFormState({
      status: "success",
      message: data.message ?? "Check your email for the next step."
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-800" htmlFor="name">
          Name
        </label>
        <input
          className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          id="name"
          name="name"
          required
          type="text"
          autoComplete="name"
        />
      </div>
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
          minLength={12}
          type="password"
          autoComplete="new-password"
        />
      </div>
      <button
        className="w-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={formState.status === "submitting"}
        type="submit"
      >
        {formState.status === "submitting" ? "Creating account..." : "Create account"}
      </button>
      {formState.message ? (
        <p className="text-sm text-slate-700" role="status">
          {formState.message}
        </p>
      ) : null}
    </form>
  );
}

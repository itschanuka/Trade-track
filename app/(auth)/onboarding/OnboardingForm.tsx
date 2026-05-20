"use client";

import { useState } from "react";

type FormState = {
  status: "idle" | "checking" | "submitting" | "success" | "error";
  message: string;
  slug: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function OnboardingForm() {
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: "",
    slug: ""
  });

  async function checkSlug(slug: string) {
    if (slug.length < 3) {
      setFormState((current) => ({
        ...current,
        status: "idle",
        message: "",
        slug
      }));
      return;
    }

    setFormState((current) => ({ ...current, status: "checking", slug }));
    const response = await fetch(`/api/onboarding/slug?slug=${encodeURIComponent(slug)}`);
    const data = (await response.json()) as {
      available?: boolean;
      reserved?: boolean;
      slug?: string;
    };

    setFormState((current) => ({
      ...current,
      status: "idle",
      slug: data.slug ?? slug,
      message: data.available
        ? "Slug is available."
        : data.reserved
          ? "That slug is reserved."
          : "That slug is already taken."
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState((current) => ({ ...current, status: "submitting", message: "" }));

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        slug: formData.get("slug"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        website: formData.get("website"),
        defaultPaymentTerms: formData.get("defaultPaymentTerms"),
        defaultTaxRate: formData.get("defaultTaxRate"),
        defaultPaymentInstructions: formData.get("defaultPaymentInstructions"),
        defaultQuoteExpiry: formData.get("defaultQuoteExpiry"),
        invoicePrefix: formData.get("invoicePrefix"),
        quotePrefix: formData.get("quotePrefix")
      })
    });
    const data = (await response.json()) as { redirectUrl?: string; error?: string };

    if (!response.ok || !data.redirectUrl) {
      setFormState((current) => ({
        ...current,
        status: "error",
        message: data.error ?? "We could not create that organization."
      }));
      return;
    }

    window.location.assign(data.redirectUrl);
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <section className="grid gap-4">
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="name">
            Business name
          </label>
          <input
            className="mt-2 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            id="name"
            name="name"
            required
            type="text"
            onChange={(event) => {
              const nextSlug = slugify(event.currentTarget.value);
              setFormState((current) => ({ ...current, slug: nextSlug }));
            }}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-800" htmlFor="slug">
            Organization slug
          </label>
          <input
            className="mt-2 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            id="slug"
            name="slug"
            required
            minLength={3}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            type="text"
            value={formState.slug}
            onBlur={(event) => checkSlug(event.currentTarget.value)}
            onChange={(event) => {
              setFormState((current) => ({
                ...current,
                slug: slugify(event.currentTarget.value),
                message: ""
              }));
            }}
          />
          <p className="mt-2 text-xs text-slate-500">
            This becomes your tenant address after routing is enabled.
          </p>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-base font-semibold text-slate-950">Business profile</h2>
        <input className="border border-slate-300 px-3 py-2 text-sm" name="email" placeholder="Business email" type="email" />
        <input className="border border-slate-300 px-3 py-2 text-sm" name="phone" placeholder="Business phone" type="tel" />
        <input className="border border-slate-300 px-3 py-2 text-sm" name="website" placeholder="Website" type="url" />
        <textarea className="min-h-24 border border-slate-300 px-3 py-2 text-sm" name="address" placeholder="Business address" />
      </section>

      <section className="grid gap-4">
        <h2 className="text-base font-semibold text-slate-950">Invoice defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input className="border border-slate-300 px-3 py-2 text-sm" name="invoicePrefix" defaultValue="INV-" placeholder="Invoice prefix" required />
          <input className="border border-slate-300 px-3 py-2 text-sm" name="quotePrefix" defaultValue="QT-" placeholder="Quote prefix" required />
          <input className="border border-slate-300 px-3 py-2 text-sm" name="defaultPaymentTerms" defaultValue="14" min="0" max="120" type="number" required />
          <input className="border border-slate-300 px-3 py-2 text-sm" name="defaultQuoteExpiry" defaultValue="7" min="1" max="120" type="number" required />
          <input className="border border-slate-300 px-3 py-2 text-sm" name="defaultTaxRate" defaultValue="0" min="0" max="100" step="0.01" type="number" required />
        </div>
        <textarea className="min-h-24 border border-slate-300 px-3 py-2 text-sm" name="defaultPaymentInstructions" placeholder="Payment instructions" />
      </section>

      <button
        className="bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={formState.status === "submitting" || formState.status === "checking"}
        type="submit"
      >
        {formState.status === "submitting" ? "Creating organization..." : "Create organization"}
      </button>
      {formState.message ? (
        <p className="text-sm text-slate-700" role="status">
          {formState.message}
        </p>
      ) : null}
    </form>
  );
}

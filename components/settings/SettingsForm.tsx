"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

type SettingsFormValues = {
  address: string;
  defaultPaymentInstructions: string;
  defaultPaymentTerms: number;
  defaultQuoteExpiry: number;
  defaultTaxRate: number;
  email: string;
  invoicePrefix: string;
  name: string;
  phone: string;
  quotePrefix: string;
  registrationNo: string;
  reminderDay7: boolean;
  reminderDay14: boolean;
  reminderOverdue: boolean;
  website: string;
};

type SettingsFormProps = {
  apiBasePath: string;
  initialValues: SettingsFormValues;
};

type SettingsResponse = {
  organization: SettingsFormValues;
};

type ErrorResponse = {
  error: string;
};

function getApiPath(apiBasePath: string, path: string) {
  return `${apiBasePath}${path}`;
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return fallback;
}

export function SettingsForm({ apiBasePath, initialValues }: SettingsFormProps) {
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch(getApiPath(apiBasePath, "/api/settings"), {
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as SettingsResponse | ErrorResponse;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Settings could not be saved."));
      }

      setForm((payload as SettingsResponse).organization);
      setSuccess("Settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void submitSettings(event)}>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Business profile</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              maxLength={120}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              value={form.name}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              maxLength={160}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              maxLength={60}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              value={form.phone}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              maxLength={160}
              onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
              value={form.website}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Registration no.
            </span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              maxLength={80}
              onChange={(event) =>
                setForm((current) => ({ ...current, registrationNo: event.target.value }))
              }
              value={form.registrationNo}
            />
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              maxLength={500}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              value={form.address}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Invoice defaults</h2>
          <div className="mt-4 grid gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice prefix
              </span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                maxLength={12}
                onChange={(event) =>
                  setForm((current) => ({ ...current, invoicePrefix: event.target.value }))
                }
                required
                value={form.invoicePrefix}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment terms
              </span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                min={0}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    defaultPaymentTerms: Number(event.target.value)
                  }))
                }
                type="number"
                value={form.defaultPaymentTerms}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Default tax rate
              </span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                max={100}
                min={0}
                onChange={(event) =>
                  setForm((current) => ({ ...current, defaultTaxRate: Number(event.target.value) }))
                }
                step="0.01"
                type="number"
                value={form.defaultTaxRate}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment instructions
              </span>
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                maxLength={2000}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    defaultPaymentInstructions: event.target.value
                  }))
                }
                value={form.defaultPaymentInstructions}
              />
            </label>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Quote defaults</h2>
          <div className="mt-4 grid gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quote prefix
              </span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                maxLength={12}
                onChange={(event) =>
                  setForm((current) => ({ ...current, quotePrefix: event.target.value }))
                }
                required
                value={form.quotePrefix}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quote expiry
              </span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                min={0}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    defaultQuoteExpiry: Number(event.target.value)
                  }))
                }
                type="number"
                value={form.defaultQuoteExpiry}
              />
            </label>
          </div>

          <h2 className="mt-6 text-base font-semibold text-slate-950">Reminder toggles</h2>
          <div className="mt-4 space-y-3">
            {[
              ["reminderDay7", "7-day sent invoice follow-up"],
              ["reminderDay14", "14-day sent invoice follow-up"],
              ["reminderOverdue", "Overdue invoice reminders"]
            ].map(([key, label]) => (
              <label
                className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-3 py-2 text-sm"
                key={key}
              >
                <span className="font-medium text-slate-700">{label}</span>
                <input
                  checked={Boolean(form[key as keyof SettingsFormValues])}
                  className="h-4 w-4"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.checked
                    }))
                  }
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <button
        className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save settings
      </button>
    </form>
  );
}

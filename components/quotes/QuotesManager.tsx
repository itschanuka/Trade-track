"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { JobStatus, QuoteStatus } from "@prisma/client";
import {
  BriefcaseBusiness,
  Download,
  FileText,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

type ClientRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type QuoteLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type QuoteRecord = {
  id: string;
  clientId: string;
  quoteNumber: string;
  status: QuoteStatus;
  issueDate: string;
  expiryDate: string | null;
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  convertedAt: string | null;
  client: ClientRecord;
  jobs?: Array<{
    id: string;
    title: string;
    status: JobStatus;
    createdAt: string;
  }>;
};

type QuoteFormLineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

type QuoteFormState = {
  clientId: string;
  status: QuoteStatus;
  issueDate: string;
  expiryDate: string;
  taxRate: string;
  notes: string;
  lineItems: QuoteFormLineItem[];
};

type QuotePayload = {
  clientId: string;
  status: QuoteStatus;
  issueDate: string;
  expiryDate: string;
  taxRate: number;
  notes: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

type QuotesResponse = {
  quotes: QuoteRecord[];
};

type QuoteResponse = {
  quote: QuoteRecord;
};

type ClientsResponse = {
  clients: ClientRecord[];
};

type ConvertResponse = {
  job: {
    id: string;
    title: string;
  };
};

type PdfResponse = {
  expiresIn: number;
  storageKey: string;
  url: string;
};

type ErrorResponse = {
  error: string;
};

type QuotesManagerProps = {
  apiBasePath: string;
};

const statuses: Array<{ value: QuoteStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" }
];

const emptyLineItem: QuoteFormLineItem = {
  description: "",
  quantity: "1",
  unitPrice: ""
};

const emptyForm: QuoteFormState = {
  clientId: "",
  status: "DRAFT",
  issueDate: "",
  expiryDate: "",
  taxRate: "0",
  notes: "",
  lineItems: [{ ...emptyLineItem }]
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

function formatStatus(status: QuoteStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function formatClientName(client: ClientRecord | null | undefined) {
  return client?.name?.trim() || "Unknown client";
}

function hasCreatedJob(quote: QuoteRecord) {
  return quote.convertedAt !== null || (quote.jobs?.length ?? 0) > 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency"
  }).format(value);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toApiDate(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function calculateTotals(form: QuoteFormState) {
  const lineItems = form.lineItems.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;

    return {
      description: item.description.trim(),
      quantity,
      unitPrice,
      lineTotal: roundMoney(quantity * unitPrice)
    };
  });
  const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const taxRate = Number(form.taxRate) || 0;
  const taxAmount = roundMoney(subtotal * (taxRate / 100));
  const total = roundMoney(subtotal + taxAmount);

  return { lineItems, subtotal, taxAmount, total };
}

function buildPayload(form: QuoteFormState): QuotePayload {
  return {
    clientId: form.clientId,
    status: form.status,
    issueDate: toApiDate(form.issueDate),
    expiryDate: toApiDate(form.expiryDate),
    taxRate: Number(form.taxRate) || 0,
    notes: form.notes.trim(),
    lineItems: form.lineItems.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice)
    }))
  };
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  const tone = {
    ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
    EXPIRED: "border-amber-200 bg-amber-50 text-amber-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
    SENT: "border-blue-200 bg-blue-50 text-blue-700"
  }[status];

  return (
    <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", tone)}>
      {formatStatus(status)}
    </span>
  );
}

function QuoteBuilder({
  clients,
  disabled,
  form,
  onAddLine,
  onChange,
  onChangeLine,
  onRemoveLine,
  onSubmit,
  totals
}: {
  clients: ClientRecord[];
  disabled: boolean;
  form: QuoteFormState;
  onAddLine: () => void;
  onChange: (field: keyof QuoteFormState, value: string) => void;
  onChangeLine: (index: number, field: keyof QuoteFormLineItem, value: string) => void;
  onRemoveLine: (index: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  totals: ReturnType<typeof calculateTotals>;
}) {
  return (
    <form className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center gap-2">
        <Plus className="h-4 w-4 text-slate-500" />
        <h2 className="text-base font-semibold text-slate-950">Quote builder</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</span>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            onChange={(event) => onChange("clientId", event.target.value)}
            required
            value={form.clientId}
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            onChange={(event) => onChange("status", event.target.value)}
            value={form.status}
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue date</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            onChange={(event) => onChange("issueDate", event.target.value)}
            type="datetime-local"
            value={form.issueDate}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry date</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            onChange={(event) => onChange("expiryDate", event.target.value)}
            type="datetime-local"
            value={form.expiryDate}
          />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-950">Line items</h3>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            disabled={disabled || form.lineItems.length >= 100}
            onClick={onAddLine}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Add line
          </button>
        </div>

        {form.lineItems.map((item, index) => (
          <div
            className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_96px_128px_40px]"
            key={`line-${index}`}
          >
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </span>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                disabled={disabled}
                maxLength={240}
                onChange={(event) => onChangeLine(index, "description", event.target.value)}
                required
                value={item.description}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</span>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                disabled={disabled}
                min="0.01"
                onChange={(event) => onChangeLine(index, "quantity", event.target.value)}
                required
                step="0.01"
                type="number"
                value={item.quantity}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Unit price
              </span>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                disabled={disabled}
                min="0"
                onChange={(event) => onChangeLine(index, "unitPrice", event.target.value)}
                required
                step="0.01"
                type="number"
                value={item.unitPrice}
              />
            </label>
            <button
              className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || form.lineItems.length === 1}
              onClick={() => onRemoveLine(index)}
              title="Remove line item"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_260px]">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
          <textarea
            className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            maxLength={2000}
            onChange={(event) => onChange("notes", event.target.value)}
            value={form.notes}
          />
        </label>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tax rate</span>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              disabled={disabled}
              max="100"
              min="0"
              onChange={(event) => onChange("taxRate", event.target.value)}
              step="0.01"
              type="number"
              value={form.taxRate}
            />
          </label>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-medium text-slate-950">{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Tax</dt>
              <dd className="font-medium text-slate-950">{formatCurrency(totals.taxAmount)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-950">Total</dt>
              <dd className="font-bold text-slate-950">{formatCurrency(totals.total)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <button
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        type="submit"
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Create quote
      </button>
    </form>
  );
}

export function QuotesManager({ apiBasePath }: QuotesManagerProps) {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | QuoteStatus>("ALL");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [form, setForm] = useState<QuoteFormState>(emptyForm);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [convertedJobTitle, setConvertedJobTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => calculateTotals(form), [form]);
  const visibleTotal = quotes.reduce((sum, quote) => sum + quote.total, 0);

  const quotesPath = useMemo(() => {
    const params = new URLSearchParams();

    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }

    if (appliedSearch) {
      params.set("search", appliedSearch);
    }

    const query = params.toString();
    return getApiPath(apiBasePath, `/api/quotes${query ? `?${query}` : ""}`);
  }, [apiBasePath, appliedSearch, statusFilter]);

  const loadQuotes = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(quotesPath, { cache: "no-store", signal });
      const payload = (await response.json()) as QuotesResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not load quotes."));
        setQuotes([]);
        return;
      }

      const nextQuotes = "quotes" in payload ? payload.quotes : [];
      setQuotes(nextQuotes);
      setSelectedQuote((current) =>
        current ? nextQuotes.find((quote) => quote.id === current.id) ?? current : current
      );
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError("Could not load quotes.");
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [quotesPath]);

  const loadClients = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(getApiPath(apiBasePath, "/api/clients"), {
        cache: "no-store",
        signal
      });
      const payload = (await response.json()) as ClientsResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not load clients."));
        setClients([]);
        return;
      }

      setClients("clients" in payload ? payload.clients : []);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError("Could not load clients.");
      setClients([]);
    }
  }, [apiBasePath]);

  useEffect(() => {
    const controller = new AbortController();
    void loadQuotes(controller.signal);

    return () => controller.abort();
  }, [loadQuotes]);

  useEffect(() => {
    const controller = new AbortController();
    void loadClients(controller.signal);

    return () => controller.abort();
  }, [loadClients]);

  function upsertQuote(quote: QuoteRecord) {
    setQuotes((current) => {
      const exists = current.some((item) => item.id === quote.id);
      return exists ? current.map((item) => (item.id === quote.id ? quote : item)) : [quote, ...current];
    });
    setSelectedQuote((current) => (current?.id === quote.id ? quote : current));
  }

  function updateForm(field: keyof QuoteFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateLineItem(index: number, field: keyof QuoteFormLineItem, value: string) {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function addLineItem() {
    setForm((current) => ({
      ...current,
      lineItems: [...current.lineItems, { ...emptyLineItem }]
    }));
  }

  function removeLineItem(index: number) {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setConvertedJobTitle(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, "/api/quotes"), {
        body: JSON.stringify(buildPayload(form)),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as QuoteResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not create quote."));
        return;
      }

      if ("quote" in payload) {
        upsertQuote(payload.quote);
        setSelectedQuote(payload.quote);
        setForm(emptyForm);
      }
    } catch {
      setError("Could not create quote.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateQuoteStatus(quote: QuoteRecord, status: QuoteStatus) {
    setUpdatingQuoteId(quote.id);
    setConvertedJobTitle(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/quotes/${quote.id}`), {
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as QuoteResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not update quote status."));
        return;
      }

      if ("quote" in payload) {
        upsertQuote(payload.quote);
      }
    } catch {
      setError("Could not update quote status.");
    } finally {
      setUpdatingQuoteId(null);
    }
  }

  async function convertQuoteToJob(quote: QuoteRecord) {
    setConvertingQuoteId(quote.id);
    setConvertedJobTitle(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/quotes/${quote.id}/convert-to-job`), {
        body: JSON.stringify({ title: `Quote ${quote.quoteNumber}` }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as ConvertResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not convert quote to job."));
        return;
      }

      if ("job" in payload) {
        setConvertedJobTitle(payload.job.title);
        await loadQuotes();
      }
    } catch {
      setError("Could not convert quote to job.");
    } finally {
      setConvertingQuoteId(null);
    }
  }

  async function generateQuotePdf(quote: QuoteRecord) {
    setGeneratingPdfId(quote.id);
    setConvertedJobTitle(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/quotes/${quote.id}/pdf`), {
        method: "POST"
      });
      const payload = (await response.json()) as PdfResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not generate quote PDF."));
        return;
      }

      if ("url" in payload) {
        window.open(payload.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Could not generate quote PDF.");
    } finally {
      setGeneratingPdfId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quotes</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Quote builder
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Build quotes with line items, server-backed totals, status actions, and accepted
            quote-to-job conversion.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible quotes</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{quotes.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible total</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{formatCurrency(visibleTotal)}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {convertedJobTitle ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Created job: {convertedJobTitle}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | QuoteStatus)}
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <form
                className="flex flex-1 flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAppliedSearch(search.trim());
                }}
              >
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                    maxLength={120}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search quote number, client, or notes"
                    value={search}
                  />
                </label>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </button>
                {appliedSearch ? (
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => {
                      setSearch("");
                      setAppliedSearch("");
                    }}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                ) : null}
              </form>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading quotes
              </div>
            ) : quotes.length === 0 ? (
              <div className="min-h-64 px-6 py-12 text-center">
                <h2 className="text-lg font-semibold text-slate-950">No quotes found</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {clients.length === 0
                    ? "Create a client first, then build quotes for that client."
                    : "Create a quote or adjust the filters to see more results."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {quotes.map((quote) => (
                  <article
                    className={cn(
                      "grid gap-4 p-4 lg:grid-cols-[1fr_auto]",
                      selectedQuote?.id === quote.id && "bg-slate-50"
                    )}
                    key={quote.id}
                  >
                    <button
                      className="min-w-0 text-left"
                      onClick={() => setSelectedQuote(quote)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-950">
                          {quote.quoteNumber}
                        </h2>
                        <StatusBadge status={quote.status} />
                        {hasCreatedJob(quote) ? (
                          <span className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-medium text-emerald-700">
                            Job created
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{formatClientName(quote.client)}</p>
                      {quote.jobs?.[0] ? (
                        <p className="mt-1 text-xs text-slate-500">Job: {quote.jobs[0].title}</p>
                      ) : null}
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                        <p>Issued {new Date(quote.issueDate).toLocaleDateString()}</p>
                        <p>
                          Expires{" "}
                          {quote.expiryDate
                            ? new Date(quote.expiryDate).toLocaleDateString()
                            : "not set"}
                        </p>
                        <p className="font-semibold text-slate-950">{formatCurrency(quote.total)}</p>
                      </div>
                    </button>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {statuses.map((status) => (
                        <button
                          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={updatingQuoteId === quote.id || quote.status === status.value}
                          key={status.value}
                          onClick={() => void updateQuoteStatus(quote, status.value)}
                          type="button"
                        >
                          {updatingQuoteId === quote.id && quote.status !== status.value ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            status.label
                          )}
                        </button>
                      ))}
                      {quote.status === "ACCEPTED" && !hasCreatedJob(quote) ? (
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={convertingQuoteId === quote.id}
                          onClick={() => void convertQuoteToJob(quote)}
                          type="button"
                        >
                          {convertingQuoteId === quote.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BriefcaseBusiness className="h-3.5 w-3.5" />
                          )}
                          Convert
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <QuoteBuilder
            clients={clients}
            disabled={isSaving || clients.length === 0}
            form={form}
            onAddLine={addLineItem}
            onChange={updateForm}
            onChangeLine={updateLineItem}
            onRemoveLine={removeLineItem}
            onSubmit={(event) => void submitCreate(event)}
            totals={totals}
          />

          {clients.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Quotes need an active client. Create a client before building a quote.
            </div>
          ) : null}

          {selectedQuote ? (
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quote detail
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {selectedQuote.quoteNumber}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{formatClientName(selectedQuote.client)}</p>
                  {selectedQuote.client.email ? (
                    <p className="mt-1 text-xs text-slate-500">{selectedQuote.client.email}</p>
                  ) : null}
                  {selectedQuote.client.phone ? (
                    <p className="mt-1 text-xs text-slate-500">{selectedQuote.client.phone}</p>
                  ) : null}
                </div>
                <StatusBadge status={selectedQuote.status} />
              </div>

              <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Item</th>
                      <th className="px-3 py-2 text-right font-semibold">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedQuote.lineItems.map((item, index) => (
                      <tr key={`${selectedQuote.id}-${index}`}>
                        <td className="px-3 py-2 text-slate-700">{item.description}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-950">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Job</dt>
                  <dd className="font-medium text-slate-950">
                    {selectedQuote.jobs?.[0] ? selectedQuote.jobs[0].title : "Not created yet"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-medium text-slate-950">
                    {formatCurrency(selectedQuote.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tax</dt>
                  <dd className="font-medium text-slate-950">
                    {formatCurrency(selectedQuote.taxAmount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-base">
                  <dt className="font-semibold text-slate-950">Total</dt>
                  <dd className="font-bold text-slate-950">{formatCurrency(selectedQuote.total)}</dd>
                </div>
              </dl>

              {selectedQuote.status === "ACCEPTED" && !hasCreatedJob(selectedQuote) ? (
                <button
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={convertingQuoteId === selectedQuote.id}
                  onClick={() => void convertQuoteToJob(selectedQuote)}
                  type="button"
                >
                  {convertingQuoteId === selectedQuote.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BriefcaseBusiness className="h-4 w-4" />
                  )}
                  Convert to job
                </button>
              ) : null}

              <button
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={generatingPdfId === selectedQuote.id}
                onClick={() => void generateQuotePdf(selectedQuote)}
                type="button"
              >
                {generatingPdfId === selectedQuote.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Generate PDF
              </button>

              {selectedQuote.status === "SENT" ? (
                <button
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingQuoteId === selectedQuote.id}
                  onClick={() => void updateQuoteStatus(selectedQuote, "ACCEPTED")}
                  type="button"
                >
                  <Send className="h-4 w-4" />
                  Mark accepted
                </button>
              ) : null}
            </div>
          ) : (
            <div className="hidden rounded-md border border-slate-200 bg-white p-4 text-center shadow-sm xl:block">
              <h2 className="text-base font-semibold text-slate-950">No quote selected</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Select a quote from the list to inspect its line items and totals.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

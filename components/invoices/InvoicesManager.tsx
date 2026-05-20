"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InvoiceStatus, JobStatus } from "@prisma/client";
import {
  BriefcaseBusiness,
  CreditCard,
  Download,
  Edit3,
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

type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type InvoicePayment = {
  id: string;
  amount: number;
  method: string | null;
  reference: string | null;
  paidAt: string;
  notes: string | null;
};

type InvoiceJob = {
  id: string;
  title: string;
  status: JobStatus;
};

type InvoiceRecord = {
  id: string;
  clientId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes: string | null;
  paymentInstructions: string | null;
  sentAt: string | null;
  paidAt: string | null;
  client: ClientRecord;
  job?: InvoiceJob | null;
  payments?: InvoicePayment[];
};

type CompletedJobRecord = {
  id: string;
  clientId: string;
  title: string;
  status: JobStatus;
  completedAt: string | null;
  materials: string | null;
  notes: string | null;
  invoiceId?: string | null;
  client: ClientRecord;
};

type InvoiceFormLineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

type InvoiceFormState = {
  clientId: string;
  status: "DRAFT" | "SENT";
  issueDate: string;
  dueDate: string;
  taxRate: string;
  notes: string;
  paymentInstructions: string;
  lineItems: InvoiceFormLineItem[];
};

type PaymentFormState = {
  amount: string;
  method: string;
  reference: string;
  paidAt: string;
  notes: string;
};

type InvoicePayload = {
  clientId: string;
  status: "DRAFT" | "SENT";
  issueDate: string;
  dueDate: string;
  taxRate: number;
  notes: string;
  paymentInstructions: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

type InvoicesResponse = {
  invoices: InvoiceRecord[];
};

type InvoiceResponse = {
  invoice: InvoiceRecord;
};

type ClientsResponse = {
  clients: ClientRecord[];
};

type JobsResponse = {
  jobs: CompletedJobRecord[];
};

type PaymentResponse = {
  invoice: InvoiceRecord;
  payment: InvoicePayment;
};

type PdfResponse = {
  expiresIn: number;
  storageKey: string;
  url: string;
};

type ErrorResponse = {
  error: string;
};

type InvoicesManagerProps = {
  apiBasePath: string;
};

const statuses: Array<{ value: InvoiceStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" }
];

const emptyLineItem: InvoiceFormLineItem = {
  description: "",
  quantity: "1",
  unitPrice: ""
};

const emptyForm: InvoiceFormState = {
  clientId: "",
  status: "DRAFT",
  issueDate: "",
  dueDate: "",
  taxRate: "0",
  notes: "",
  paymentInstructions: "",
  lineItems: [{ ...emptyLineItem }]
};

const emptyPaymentForm: PaymentFormState = {
  amount: "",
  method: "",
  reference: "",
  paidAt: "",
  notes: ""
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

function formatStatus(status: InvoiceStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function formatClientName(client: ClientRecord | null | undefined) {
  return client?.name?.trim() || "Unknown client";
}

function isOverdue(invoice: Pick<InvoiceRecord, "balance" | "dueDate" | "status">) {
  if (!invoice.dueDate || invoice.balance <= 0 || invoice.status === "PAID") {
    return false;
  }

  return new Date(invoice.dueDate).getTime() < Date.now();
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

function toLocalDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function calculateTotals(form: InvoiceFormState) {
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

function buildPayload(form: InvoiceFormState): InvoicePayload {
  return {
    clientId: form.clientId,
    status: form.status,
    issueDate: toApiDate(form.issueDate),
    dueDate: toApiDate(form.dueDate),
    taxRate: Number(form.taxRate) || 0,
    notes: form.notes.trim(),
    paymentInstructions: form.paymentInstructions.trim(),
    lineItems: form.lineItems.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice)
    }))
  };
}

function formFromInvoice(invoice: InvoiceRecord): InvoiceFormState {
  return {
    clientId: invoice.clientId,
    status: invoice.status === "SENT" ? "SENT" : "DRAFT",
    issueDate: toLocalDateTime(invoice.issueDate),
    dueDate: toLocalDateTime(invoice.dueDate),
    taxRate: invoice.taxRate.toString(),
    notes: invoice.notes ?? "",
    paymentInstructions: invoice.paymentInstructions ?? "",
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString()
    }))
  };
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const tone = {
    CANCELLED: "border-slate-300 bg-slate-100 text-slate-600",
    DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
    OVERDUE: "border-red-200 bg-red-50 text-red-700",
    PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
    SENT: "border-blue-200 bg-blue-50 text-blue-700"
  }[status];

  return (
    <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", tone)}>
      {formatStatus(status)}
    </span>
  );
}

function InvoiceBuilder({
  clients,
  disabled,
  form,
  mode,
  onAddLine,
  onChange,
  onChangeLine,
  onRemoveLine,
  onSubmit,
  totals
}: {
  clients: ClientRecord[];
  disabled: boolean;
  form: InvoiceFormState;
  mode: "create" | "edit" | "convert";
  onAddLine: () => void;
  onChange: (field: keyof InvoiceFormState, value: string) => void;
  onChangeLine: (index: number, field: keyof InvoiceFormLineItem, value: string) => void;
  onRemoveLine: (index: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  totals: ReturnType<typeof calculateTotals>;
}) {
  const title = {
    convert: "Job invoice",
    create: "Create invoice",
    edit: "Edit invoice"
  }[mode];
  const buttonLabel = {
    convert: "Create from job",
    create: "Create invoice",
    edit: "Save invoice"
  }[mode];

  return (
    <form className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-500" />
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</span>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled || mode === "convert"}
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
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
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
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due date</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            onChange={(event) => onChange("dueDate", event.target.value)}
            type="datetime-local"
            value={form.dueDate}
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
            key={`invoice-line-${index}`}
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
        <div className="space-y-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              disabled={disabled}
              maxLength={2000}
              onChange={(event) => onChange("notes", event.target.value)}
              value={form.notes}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment instructions
            </span>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              disabled={disabled}
              maxLength={2000}
              onChange={(event) => onChange("paymentInstructions", event.target.value)}
              value={form.paymentInstructions}
            />
          </label>
        </div>
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
        {buttonLabel}
      </button>
    </form>
  );
}

function PaymentForm({
  disabled,
  form,
  invoice,
  onChange,
  onSubmit
}: {
  disabled: boolean;
  form: PaymentFormState;
  invoice: InvoiceRecord;
  onChange: (field: keyof PaymentFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Record payment</h3>
        <span className="text-xs font-medium text-slate-500">
          Balance {formatCurrency(invoice.balance)}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            max={invoice.balance}
            min="0.01"
            onChange={(event) => onChange("amount", event.target.value)}
            required
            step="0.01"
            type="number"
            value={form.amount}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid at</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            onChange={(event) => onChange("paidAt", event.target.value)}
            type="datetime-local"
            value={form.paidAt}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Method</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            maxLength={80}
            onChange={(event) => onChange("method", event.target.value)}
            value={form.method}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</span>
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            maxLength={160}
            onChange={(event) => onChange("reference", event.target.value)}
            value={form.reference}
          />
        </label>
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            disabled={disabled}
            maxLength={2000}
            onChange={(event) => onChange("notes", event.target.value)}
            value={form.notes}
          />
        </label>
      </div>
      <button
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || invoice.balance <= 0}
        type="submit"
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        Record payment
      </button>
    </form>
  );
}

export function InvoicesManager({ apiBasePath }: InvoicesManagerProps) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJobRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | InvoiceStatus>("ALL");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [createForm, setCreateForm] = useState<InvoiceFormState>(emptyForm);
  const [editForm, setEditForm] = useState<InvoiceFormState>(emptyForm);
  const [conversionForm, setConversionForm] = useState<InvoiceFormState>(emptyForm);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(emptyPaymentForm);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [selectedJob, setSelectedJob] = useState<CompletedJobRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createTotals = useMemo(() => calculateTotals(createForm), [createForm]);
  const editTotals = useMemo(() => calculateTotals(editForm), [editForm]);
  const conversionTotals = useMemo(() => calculateTotals(conversionForm), [conversionForm]);
  const visibleOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balance, 0);

  const invoicesPath = useMemo(() => {
    const params = new URLSearchParams();

    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }

    if (appliedSearch) {
      params.set("search", appliedSearch);
    }

    const query = params.toString();
    return getApiPath(apiBasePath, `/api/invoices${query ? `?${query}` : ""}`);
  }, [apiBasePath, appliedSearch, statusFilter]);

  const loadInvoices = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(invoicesPath, { cache: "no-store", signal });
      const payload = (await response.json()) as InvoicesResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not load invoices."));
        setInvoices([]);
        return;
      }

      setInvoices("invoices" in payload ? payload.invoices : []);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError("Could not load invoices.");
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [invoicesPath]);

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

  const loadCompletedJobs = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(getApiPath(apiBasePath, "/api/jobs?status=COMPLETED"), {
        cache: "no-store",
        signal
      });
      const payload = (await response.json()) as JobsResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not load completed jobs."));
        setCompletedJobs([]);
        return;
      }

      setCompletedJobs("jobs" in payload ? payload.jobs.filter((job) => !job.invoiceId) : []);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError("Could not load completed jobs.");
      setCompletedJobs([]);
    }
  }, [apiBasePath]);

  useEffect(() => {
    const controller = new AbortController();
    void loadInvoices(controller.signal);

    return () => controller.abort();
  }, [loadInvoices]);

  useEffect(() => {
    const controller = new AbortController();
    void loadClients(controller.signal);
    void loadCompletedJobs(controller.signal);

    return () => controller.abort();
  }, [loadClients, loadCompletedJobs]);

  function upsertInvoice(invoice: InvoiceRecord) {
    setInvoices((current) => {
      const exists = current.some((item) => item.id === invoice.id);
      return exists
        ? current.map((item) => (item.id === invoice.id ? { ...item, ...invoice } : item))
        : [invoice, ...current];
    });
    setSelectedInvoice((current) => (current?.id === invoice.id ? { ...current, ...invoice } : current));
    setEditingInvoice((current) => (current?.id === invoice.id ? { ...current, ...invoice } : current));
  }

  function updateCreateForm(field: keyof InvoiceFormState, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditForm(field: keyof InvoiceFormState, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function updateConversionForm(field: keyof InvoiceFormState, value: string) {
    setConversionForm((current) => ({ ...current, [field]: value }));
  }

  function updateLineItem(
    formSetter: React.Dispatch<React.SetStateAction<InvoiceFormState>>,
    index: number,
    field: keyof InvoiceFormLineItem,
    value: string
  ) {
    formSetter((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function addLineItem(formSetter: React.Dispatch<React.SetStateAction<InvoiceFormState>>) {
    formSetter((current) => ({
      ...current,
      lineItems: [...current.lineItems, { ...emptyLineItem }]
    }));
  }

  function removeLineItem(
    formSetter: React.Dispatch<React.SetStateAction<InvoiceFormState>>,
    index: number
  ) {
    formSetter((current) => ({
      ...current,
      lineItems:
        current.lineItems.length === 1
          ? current.lineItems
          : current.lineItems.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function loadInvoiceDetail(invoice: InvoiceRecord) {
    setDetailLoadingId(invoice.id);
    setSelectedInvoice(invoice);
    setPaymentForm((current) => ({
      ...current,
      amount: invoice.balance > 0 ? invoice.balance.toString() : ""
    }));
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/invoices/${invoice.id}`), {
        cache: "no-store"
      });
      const payload = (await response.json()) as InvoiceResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not load invoice detail."));
        return;
      }

      if ("invoice" in payload) {
        upsertInvoice(payload.invoice);
        setSelectedInvoice(payload.invoice);
        setPaymentForm((current) => ({
          ...current,
          amount: payload.invoice.balance > 0 ? payload.invoice.balance.toString() : ""
        }));
      }
    } catch {
      setError("Could not load invoice detail.");
    } finally {
      setDetailLoadingId(null);
    }
  }

  function startEditing(invoice: InvoiceRecord) {
    setEditingInvoice(invoice);
    setSelectedInvoice(invoice);
    setEditForm(formFromInvoice(invoice));
  }

  function selectJobForConversion(jobId: string) {
    const job = completedJobs.find((item) => item.id === jobId) ?? null;
    setSelectedJob(job);
    setSuccessMessage(null);

    if (!job) {
      setConversionForm(emptyForm);
      return;
    }

    setConversionForm({
      ...emptyForm,
      clientId: job.clientId,
      notes: `Created from job: ${job.title}`,
      lineItems: [
        {
          description: job.title,
          quantity: "1",
          unitPrice: ""
        }
      ]
    });
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, "/api/invoices"), {
        body: JSON.stringify(buildPayload(createForm)),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as InvoiceResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not create invoice."));
        return;
      }

      if ("invoice" in payload) {
        upsertInvoice(payload.invoice);
        setSelectedInvoice(payload.invoice);
        setCreateForm(emptyForm);
        setSuccessMessage(`Created invoice ${payload.invoice.invoiceNumber}.`);
      }
    } catch {
      setError("Could not create invoice.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingInvoice) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/invoices/${editingInvoice.id}`), {
        body: JSON.stringify(buildPayload(editForm)),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as InvoiceResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not update invoice."));
        return;
      }

      if ("invoice" in payload) {
        upsertInvoice(payload.invoice);
        setSelectedInvoice(payload.invoice);
        setEditingInvoice(null);
        setEditForm(emptyForm);
        setSuccessMessage(`Updated invoice ${payload.invoice.invoiceNumber}.`);
      }
    } catch {
      setError("Could not update invoice.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateInvoiceStatus(invoice: InvoiceRecord, status: InvoiceStatus) {
    setUpdatingInvoiceId(invoice.id);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/invoices/${invoice.id}`), {
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as InvoiceResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not update invoice status."));
        return;
      }

      if ("invoice" in payload) {
        upsertInvoice(payload.invoice);
        setSelectedInvoice(payload.invoice);
      }
    } catch {
      setError("Could not update invoice status.");
    } finally {
      setUpdatingInvoiceId(null);
    }
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedInvoice) {
      return;
    }

    setIsPaymentSaving(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/invoices/${selectedInvoice.id}/payments`), {
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          method: paymentForm.method.trim(),
          reference: paymentForm.reference.trim(),
          paidAt: toApiDate(paymentForm.paidAt),
          notes: paymentForm.notes.trim()
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as PaymentResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not record payment."));
        return;
      }

      if ("invoice" in payload) {
        upsertInvoice(payload.invoice);
        setSelectedInvoice(payload.invoice);
        setPaymentForm(emptyPaymentForm);
        setSuccessMessage(`Recorded ${formatCurrency(payload.payment.amount)} payment.`);
      }
    } catch {
      setError("Could not record payment.");
    } finally {
      setIsPaymentSaving(false);
    }
  }

  async function submitConversion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedJob) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);

    try {
      const builtPayload = buildPayload(conversionForm);
      const payload = {
        dueDate: builtPayload.dueDate,
        issueDate: builtPayload.issueDate,
        lineItems: builtPayload.lineItems,
        notes: builtPayload.notes,
        paymentInstructions: builtPayload.paymentInstructions,
        status: builtPayload.status,
        taxRate: builtPayload.taxRate
      };
      const response = await fetch(
        getApiPath(apiBasePath, `/api/jobs/${selectedJob.id}/convert-to-invoice`),
        {
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        }
      );
      const parsedPayload = (await response.json()) as InvoiceResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(parsedPayload, "Could not create invoice from job."));
        return;
      }

      if ("invoice" in parsedPayload) {
        upsertInvoice(parsedPayload.invoice);
        setSelectedInvoice(parsedPayload.invoice);
        setCompletedJobs((current) => current.filter((job) => job.id !== selectedJob.id));
        setSelectedJob(null);
        setConversionForm(emptyForm);
        setSuccessMessage(`Created invoice ${parsedPayload.invoice.invoiceNumber} from job.`);
        await loadCompletedJobs();
      }
    } catch {
      setError("Could not create invoice from job.");
    } finally {
      setIsSaving(false);
    }
  }

  async function generateInvoicePdf(invoice: InvoiceRecord) {
    setGeneratingPdfId(invoice.id);
    setSuccessMessage(null);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/invoices/${invoice.id}/pdf`), {
        method: "POST"
      });
      const payload = (await response.json()) as PdfResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not generate invoice PDF."));
        return;
      }

      if ("url" in payload) {
        window.open(payload.url, "_blank", "noopener,noreferrer");
        setSuccessMessage(`Generated PDF for ${invoice.invoiceNumber}.`);
      }
    } catch {
      setError("Could not generate invoice PDF.");
    } finally {
      setGeneratingPdfId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Invoices</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Invoice workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Create invoices, track balances, record payments, and turn completed jobs into invoices.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible invoices</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{invoices.length}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">
              {formatCurrency(visibleOutstanding)}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | InvoiceStatus)}
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
                    placeholder="Search invoice number, client, or notes"
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
                Loading invoices
              </div>
            ) : invoices.length === 0 ? (
              <div className="min-h-64 px-6 py-12 text-center">
                <h2 className="text-lg font-semibold text-slate-950">No invoices found</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {clients.length === 0
                    ? "Create a client first, then create invoices for that client."
                    : "Create an invoice, convert a completed job, or adjust the filters."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {invoices.map((invoice) => (
                  <article
                    className={cn(
                      "grid gap-4 p-4 lg:grid-cols-[1fr_auto]",
                      selectedInvoice?.id === invoice.id && "bg-slate-50"
                    )}
                    key={invoice.id}
                  >
                    <button
                      className="min-w-0 text-left"
                      onClick={() => void loadInvoiceDetail(invoice)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-950">
                          {invoice.invoiceNumber}
                        </h2>
                        <StatusBadge status={invoice.status} />
                        {detailLoadingId === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{formatClientName(invoice.client)}</p>
                      {invoice.job ? (
                        <p className="mt-1 text-xs text-slate-500">Job: {invoice.job.title}</p>
                      ) : null}
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-5">
                        <p>Issued {new Date(invoice.issueDate).toLocaleDateString()}</p>
                        <p>
                          Due{" "}
                          {invoice.dueDate
                            ? new Date(invoice.dueDate).toLocaleDateString()
                            : "not set"}
                          {isOverdue(invoice) ? " (overdue)" : ""}
                        </p>
                        <p className="font-semibold text-slate-950">{formatCurrency(invoice.total)}</p>
                        <p>Paid {formatCurrency(invoice.amountPaid)}</p>
                        <p className="font-semibold text-slate-950">
                          Balance {formatCurrency(invoice.balance)}
                        </p>
                      </div>
                    </button>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => startEditing(invoice)}
                        type="button"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      {(["DRAFT", "SENT", "CANCELLED"] as InvoiceStatus[]).map((status) => (
                        <button
                          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={updatingInvoiceId === invoice.id || invoice.status === status}
                          key={status}
                          onClick={() => void updateInvoiceStatus(invoice, status)}
                          type="button"
                        >
                          {updatingInvoiceId === invoice.id && invoice.status !== status ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            formatStatus(status)
                          )}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <InvoiceBuilder
            clients={clients}
            disabled={isSaving || clients.length === 0}
            form={createForm}
            mode="create"
            onAddLine={() => addLineItem(setCreateForm)}
            onChange={updateCreateForm}
            onChangeLine={(index, field, value) => updateLineItem(setCreateForm, index, field, value)}
            onRemoveLine={(index) => removeLineItem(setCreateForm, index)}
            onSubmit={(event) => void submitCreate(event)}
            totals={createTotals}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-950">Completed job flow</h2>
            </div>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job</span>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                onChange={(event) => selectJobForConversion(event.target.value)}
                value={selectedJob?.id ?? ""}
              >
                <option value="">Select completed job</option>
                {completedJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {formatClientName(job.client)}
                  </option>
                ))}
              </select>
            </label>
            {completedJobs.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Completed jobs that are not invoiced yet will appear here.
              </p>
            ) : null}
          </div>

          {selectedJob ? (
            <InvoiceBuilder
              clients={clients}
              disabled={isSaving}
              form={conversionForm}
              mode="convert"
              onAddLine={() => addLineItem(setConversionForm)}
              onChange={updateConversionForm}
              onChangeLine={(index, field, value) =>
                updateLineItem(setConversionForm, index, field, value)
              }
              onRemoveLine={(index) => removeLineItem(setConversionForm, index)}
              onSubmit={(event) => void submitConversion(event)}
              totals={conversionTotals}
            />
          ) : null}

          <div
            className={cn(
              "rounded-md border border-slate-200 bg-white p-4 shadow-sm",
              !editingInvoice && "hidden xl:block"
            )}
          >
            {editingInvoice ? (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-slate-500" />
                    <h2 className="text-base font-semibold text-slate-950">
                      Edit {editingInvoice.invoiceNumber}
                    </h2>
                  </div>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50"
                    onClick={() => {
                      setEditingInvoice(null);
                      setEditForm(emptyForm);
                    }}
                    title="Close edit form"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <InvoiceBuilder
                  clients={clients}
                  disabled={isSaving}
                  form={editForm}
                  mode="edit"
                  onAddLine={() => addLineItem(setEditForm)}
                  onChange={updateEditForm}
                  onChangeLine={(index, field, value) =>
                    updateLineItem(setEditForm, index, field, value)
                  }
                  onRemoveLine={(index) => removeLineItem(setEditForm, index)}
                  onSubmit={(event) => void submitEdit(event)}
                  totals={editTotals}
                />
              </>
            ) : (
              <div className="py-8 text-center">
                <h2 className="text-base font-semibold text-slate-950">No invoice selected</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Select an invoice to inspect it, edit it, or record payments.
                </p>
              </div>
            )}
          </div>

          {selectedInvoice ? (
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Invoice detail
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {selectedInvoice.invoiceNumber}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{formatClientName(selectedInvoice.client)}</p>
                  {selectedInvoice.client.email ? (
                    <p className="mt-1 text-xs text-slate-500">{selectedInvoice.client.email}</p>
                  ) : null}
                  {selectedInvoice.client.phone ? (
                    <p className="mt-1 text-xs text-slate-500">{selectedInvoice.client.phone}</p>
                  ) : null}
                </div>
                <StatusBadge status={selectedInvoice.status} />
              </div>

              <dl className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-500">Due date</dt>
                  <dd className="text-slate-800">
                    {selectedInvoice.dueDate
                      ? new Date(selectedInvoice.dueDate).toLocaleDateString()
                      : "Not set"}
                    {isOverdue(selectedInvoice) ? " (overdue)" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Job</dt>
                  <dd className="text-slate-800">
                    {selectedInvoice.job ? selectedInvoice.job.title : "Not created from a job"}
                  </dd>
                </div>
              </dl>

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
                    {selectedInvoice.lineItems.map((item, index) => (
                      <tr key={`${selectedInvoice.id}-${index}`}>
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
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-medium text-slate-950">
                    {formatCurrency(selectedInvoice.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tax</dt>
                  <dd className="font-medium text-slate-950">
                    {formatCurrency(selectedInvoice.taxAmount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Paid</dt>
                  <dd className="font-medium text-slate-950">
                    {formatCurrency(selectedInvoice.amountPaid)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-base">
                  <dt className="font-semibold text-slate-950">Balance</dt>
                  <dd className="font-bold text-slate-950">
                    {formatCurrency(selectedInvoice.balance)}
                  </dd>
                </div>
              </dl>

              {selectedInvoice.job ? (
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Created from job: {selectedInvoice.job.title}
                </div>
              ) : null}

              <button
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={generatingPdfId === selectedInvoice.id}
                onClick={() => void generateInvoicePdf(selectedInvoice)}
                type="button"
              >
                {generatingPdfId === selectedInvoice.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Generate PDF
              </button>

              {selectedInvoice.status === "DRAFT" ? (
                <button
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingInvoiceId === selectedInvoice.id}
                  onClick={() => void updateInvoiceStatus(selectedInvoice, "SENT")}
                  type="button"
                >
                  <Send className="h-4 w-4" />
                  Mark sent
                </button>
              ) : null}

              {selectedInvoice.balance > 0 ? (
                <PaymentForm
                  disabled={isPaymentSaving}
                  form={paymentForm}
                  invoice={selectedInvoice}
                  onChange={(field, value) =>
                    setPaymentForm((current) => ({ ...current, [field]: value }))
                  }
                  onSubmit={(event) => void submitPayment(event)}
                />
              ) : null}

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-950">Payment history</h3>
                {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                  <div className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200">
                    {selectedInvoice.payments.map((payment) => (
                      <div className="p-3 text-sm" key={payment.id}>
                        <div className="flex justify-between gap-3">
                          <p className="font-medium text-slate-950">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-slate-500">
                            {new Date(payment.paidAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="mt-1 text-slate-600">
                          {payment.method || "Payment"}{" "}
                          {payment.reference ? `- ${payment.reference}` : ""}
                        </p>
                        {payment.notes ? (
                          <p className="mt-1 whitespace-pre-wrap text-slate-500">{payment.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    Select an invoice to load payment history, or record the first payment.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

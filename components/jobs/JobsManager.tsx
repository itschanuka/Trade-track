"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InvoiceStatus, JobStatus, QuoteStatus } from "@prisma/client";
import {
  BriefcaseBusiness,
  CalendarClock,
  Edit3,
  FileText,
  Loader2,
  Plus,
  Search,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

type ClientRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type JobRecord = {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  status: JobStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  location: string | null;
  durationMinutes: number | null;
  materials: string | null;
  notes: string | null;
  client: ClientRecord;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
  } | null;
  quote: {
    id: string;
    quoteNumber: string;
    status: QuoteStatus;
  } | null;
};

type JobFormState = {
  clientId: string;
  title: string;
  description: string;
  status: JobStatus;
  scheduledAt: string;
  completedAt: string;
  location: string;
  durationMinutes: string;
  materials: string;
  notes: string;
};

type JobPayload = {
  clientId?: string;
  title?: string;
  description?: string;
  status?: JobStatus;
  scheduledAt?: string;
  completedAt?: string;
  location?: string;
  durationMinutes?: number | null;
  materials?: string;
  notes?: string;
};

type JobsResponse = {
  jobs: JobRecord[];
};

type JobResponse = {
  job: JobRecord;
};

type ClientsResponse = {
  clients: ClientRecord[];
};

type ErrorResponse = {
  error: string;
};

type JobsManagerProps = {
  apiBasePath: string;
};

const statuses: Array<{ value: JobStatus; label: string }> = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "INVOICED", label: "Invoiced" },
  { value: "CANCELLED", label: "Cancelled" }
];

const emptyForm: JobFormState = {
  clientId: "",
  title: "",
  description: "",
  status: "SCHEDULED",
  scheduledAt: "",
  completedAt: "",
  location: "",
  durationMinutes: "",
  materials: "",
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

function formatStatus(status: JobStatus) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function formatClientName(client: ClientRecord | null | undefined) {
  return client?.name?.trim() || "Unknown client";
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

function toApiDate(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function formFromJob(job: JobRecord): JobFormState {
  return {
    clientId: job.clientId,
    title: job.title,
    description: job.description ?? "",
    status: job.status,
    scheduledAt: toLocalDateTime(job.scheduledAt),
    completedAt: toLocalDateTime(job.completedAt),
    location: job.location ?? "",
    durationMinutes: job.durationMinutes?.toString() ?? "",
    materials: job.materials ?? "",
    notes: job.notes ?? ""
  };
}

function buildPayload(form: JobFormState, mode: "create" | "update"): JobPayload {
  const payload: JobPayload = {};

  if (mode === "create" || form.clientId) {
    payload.clientId = form.clientId;
  }

  if (mode === "create" || form.title.trim()) {
    payload.title = form.title.trim();
  }

  payload.status = form.status;
  payload.description = form.description.trim();
  payload.scheduledAt = toApiDate(form.scheduledAt);
  payload.completedAt = toApiDate(form.completedAt);
  payload.location = form.location.trim();
  payload.materials = form.materials.trim();
  payload.notes = form.notes.trim();

  if (form.durationMinutes.trim()) {
    payload.durationMinutes = Number(form.durationMinutes);
  } else if (mode === "update") {
    payload.durationMinutes = null;
  }

  return payload;
}

function JobFields({
  clients,
  disabled,
  form,
  onChange
}: {
  clients: ClientRecord[];
  disabled: boolean;
  form: JobFormState;
  onChange: (field: keyof JobFormState, value: string) => void;
}) {
  return (
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
      <label className="space-y-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={180}
          minLength={2}
          onChange={(event) => onChange("title", event.target.value)}
          required
          value={form.title}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scheduled</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          onChange={(event) => onChange("scheduledAt", event.target.value)}
          type="datetime-local"
          value={form.scheduledAt}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          onChange={(event) => onChange("completedAt", event.target.value)}
          type="datetime-local"
          value={form.completedAt}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={500}
          onChange={(event) => onChange("location", event.target.value)}
          value={form.location}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          max={1440}
          min={1}
          onChange={(event) => onChange("durationMinutes", event.target.value)}
          placeholder="Minutes"
          type="number"
          value={form.durationMinutes}
        />
      </label>
      <label className="space-y-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>
        <textarea
          className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => onChange("description", event.target.value)}
          value={form.description}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Materials</span>
        <textarea
          className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => onChange("materials", event.target.value)}
          value={form.materials}
        />
      </label>
      <label className="space-y-1.5">
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
  );
}

export function JobsManager({ apiBasePath }: JobsManagerProps) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>("ALL");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [createForm, setCreateForm] = useState<JobFormState>(emptyForm);
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [editForm, setEditForm] = useState<JobFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const jobsPath = useMemo(() => {
    const params = new URLSearchParams();

    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }

    if (appliedSearch) {
      params.set("search", appliedSearch);
    }

    const query = params.toString();
    return getApiPath(apiBasePath, `/api/jobs${query ? `?${query}` : ""}`);
  }, [apiBasePath, appliedSearch, statusFilter]);

  const loadJobs = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(jobsPath, { cache: "no-store", signal });
      const payload = (await response.json()) as JobsResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not load jobs."));
        setJobs([]);
        return;
      }

      setJobs("jobs" in payload ? payload.jobs : []);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }

      setError("Could not load jobs.");
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [jobsPath]);

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
    void loadJobs(controller.signal);

    return () => controller.abort();
  }, [loadJobs]);

  useEffect(() => {
    const controller = new AbortController();
    void loadClients(controller.signal);

    return () => controller.abort();
  }, [loadClients]);

  function updateCreateForm(field: keyof JobFormState, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditForm(field: keyof JobFormState, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function upsertJob(job: JobRecord) {
    setJobs((current) => {
      const exists = current.some((item) => item.id === job.id);
      return exists ? current.map((item) => (item.id === job.id ? job : item)) : [job, ...current];
    });
    setSelectedJob((current) => (current?.id === job.id ? job : current));
    setEditingJob((current) => (current?.id === job.id ? job : current));
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, "/api/jobs"), {
        body: JSON.stringify(buildPayload(createForm, "create")),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as JobResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not create job."));
        return;
      }

      if ("job" in payload) {
        upsertJob(payload.job);
        setSelectedJob(payload.job);
        setCreateForm(emptyForm);
      }
    } catch {
      setError("Could not create job.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingJob) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/jobs/${editingJob.id}`), {
        body: JSON.stringify(buildPayload(editForm, "update")),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as JobResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not update job."));
        return;
      }

      if ("job" in payload) {
        upsertJob(payload.job);
        setSelectedJob(payload.job);
        setEditingJob(null);
        setEditForm(emptyForm);
      }
    } catch {
      setError("Could not update job.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateJobStatus(job: JobRecord, status: JobStatus) {
    setUpdatingStatus(job.id);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/jobs/${job.id}`), {
        body: JSON.stringify({
          status,
          completedAt: status === "COMPLETED" ? new Date().toISOString() : ""
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as JobResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not update job status."));
        return;
      }

      if ("job" in payload) {
        upsertJob(payload.job);
        setSelectedJob(payload.job);
      }
    } catch {
      setError("Could not update job status.");
    } finally {
      setUpdatingStatus(null);
    }
  }

  function startEditing(job: JobRecord) {
    setEditingJob(job);
    setSelectedJob(job);
    setEditForm(formFromJob(job));
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Jobs</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Job tracker
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Track scheduled work, in-progress jobs, completed jobs, and the client or quote each job came from.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible jobs</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{jobs.length}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | JobStatus)}
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
                    placeholder="Search title, client, location, or notes"
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
                Loading jobs
              </div>
            ) : jobs.length === 0 ? (
              <div className="min-h-64 px-6 py-12 text-center">
                <h2 className="text-lg font-semibold text-slate-950">No jobs found</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {clients.length === 0
                    ? "Create a client first, then add jobs for that client."
                    : "Create a job or adjust the filters to see more work."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {jobs.map((job) => (
                  <article
                    className={cn(
                      "grid gap-4 p-4 lg:grid-cols-[1fr_auto]",
                      selectedJob?.id === job.id && "bg-slate-50"
                    )}
                    key={job.id}
                  >
                    <button
                      className="text-left"
                      onClick={() => setSelectedJob(job)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-950">{job.title}</h2>
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                          {formatStatus(job.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{formatClientName(job.client)}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        {job.quote ? (
                          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
                            From quote {job.quote.quoteNumber}
                          </span>
                        ) : null}
                        {job.invoice ? (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                            Invoice {job.invoice.invoiceNumber}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-slate-400" />
                          {job.scheduledAt
                            ? new Date(job.scheduledAt).toLocaleString()
                            : "Not scheduled"}
                        </p>
                        <p className="flex items-center gap-2">
                          <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
                          {job.location || "No location"}
                        </p>
                      </div>
                    </button>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => startEditing(job)}
                        type="button"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>
                      {statuses.map((status) => (
                        <button
                          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={updatingStatus === job.id || job.status === status.value}
                          key={status.value}
                          onClick={() => void updateJobStatus(job, status.value)}
                          type="button"
                        >
                          {updatingStatus === job.id && job.status !== status.value ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            status.label
                          )}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <form
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
            onSubmit={(event) => void submitCreate(event)}
          >
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-950">Create job</h2>
            </div>
            <JobFields
              clients={clients}
              disabled={isSaving || clients.length === 0}
              form={createForm}
              onChange={updateCreateForm}
            />
            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || clients.length === 0}
              type="submit"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create job
            </button>
          </form>

          <div
            className={cn(
              "rounded-md border border-slate-200 bg-white p-4 shadow-sm",
              !editingJob && "hidden xl:block"
            )}
          >
            {editingJob ? (
              <form onSubmit={(event) => void submitEdit(event)}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-slate-500" />
                    <h2 className="text-base font-semibold text-slate-950">Edit job</h2>
                  </div>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50"
                    onClick={() => {
                      setEditingJob(null);
                      setEditForm(emptyForm);
                    }}
                    title="Close edit form"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <JobFields
                  clients={clients}
                  disabled={isSaving}
                  form={editForm}
                  onChange={updateEditForm}
                />
                <button
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                  Save changes
                </button>
              </form>
            ) : (
              <div className="py-8 text-center">
                <h2 className="text-base font-semibold text-slate-950">No job selected</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Select a job to inspect details or edit its work notes.
                </p>
              </div>
            )}
          </div>

          {selectedJob ? (
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Job detail
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">{selectedJob.title}</h2>
                </div>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {formatStatus(selectedJob.status)}
                </span>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-slate-500">Client</dt>
                  <dd className="text-slate-800">
                    {formatClientName(selectedJob.client)}
                    {selectedJob.client.email ? (
                      <span className="block text-xs text-slate-500">{selectedJob.client.email}</span>
                    ) : null}
                    {selectedJob.client.phone ? (
                      <span className="block text-xs text-slate-500">{selectedJob.client.phone}</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Quote</dt>
                  <dd className="text-slate-800">
                    {selectedJob.quote ? `Created from ${selectedJob.quote.quoteNumber}` : "Not created from a quote"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Invoice</dt>
                  <dd className="text-slate-800">
                    {selectedJob.invoice ? selectedJob.invoice.invoiceNumber : "Not invoiced yet"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Description</dt>
                  <dd className="whitespace-pre-wrap text-slate-800">
                    {selectedJob.description || "No description"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Materials</dt>
                  <dd className="whitespace-pre-wrap text-slate-800">
                    {selectedJob.materials || "No materials noted"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Notes</dt>
                  <dd className="whitespace-pre-wrap text-slate-800">
                    {selectedJob.notes || "No notes"}
                  </dd>
                </div>
              </dl>
              {selectedJob.status === "COMPLETED" ? (
                <button
                  className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500"
                  disabled
                  type="button"
                >
                  <FileText className="h-4 w-4" />
                  Create invoice
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

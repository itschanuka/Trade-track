"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OrgMemberRole } from "@prisma/client";
import { Edit3, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ClientRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  jobType: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    invoices: number;
    jobs: number;
    quotes: number;
  };
};

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  jobType: string;
  notes: string;
};

type ClientsResponse = {
  clients: ClientRecord[];
};

type ClientResponse = {
  client: ClientRecord;
};

type ErrorResponse = {
  error: string;
};

type ClientsManagerProps = {
  apiBasePath: string;
  role: OrgMemberRole;
};

const emptyForm: ClientFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  jobType: "",
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

function formFromClient(client: ClientRecord): ClientFormState {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    jobType: client.jobType ?? "",
    notes: client.notes ?? ""
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function ClientFields({
  disabled,
  form,
  onChange
}: {
  disabled: boolean;
  form: ClientFormState;
  onChange: (field: keyof ClientFormState, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={160}
          minLength={2}
          onChange={(event) => onChange("name", event.target.value)}
          required
          value={form.name}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={255}
          onChange={(event) => onChange("email", event.target.value)}
          type="email"
          value={form.email}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={40}
          onChange={(event) => onChange("phone", event.target.value)}
          value={form.phone}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job type</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={120}
          onChange={(event) => onChange("jobType", event.target.value)}
          value={form.jobType}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={500}
          onChange={(event) => onChange("address", event.target.value)}
          value={form.address}
        />
      </label>
      <label className="space-y-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
        <textarea
          className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => onChange("notes", event.target.value)}
          value={form.notes}
        />
      </label>
    </div>
  );
}

export function ClientsManager({ apiBasePath, role }: ClientsManagerProps) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [createForm, setCreateForm] = useState<ClientFormState>(emptyForm);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [editForm, setEditForm] = useState<ClientFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canDelete = role !== "MEMBER";
  const clientCount = clients.length;

  const apiListPath = useMemo(() => {
    const params = new URLSearchParams();

    if (appliedSearch) {
      params.set("search", appliedSearch);
    }

    const query = params.toString();
    return getApiPath(apiBasePath, `/api/clients${query ? `?${query}` : ""}`);
  }, [apiBasePath, appliedSearch]);

  const loadClients = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiListPath, {
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
    } finally {
      setIsLoading(false);
    }
  }, [apiListPath]);

  useEffect(() => {
    const controller = new AbortController();
    void loadClients(controller.signal);

    return () => controller.abort();
  }, [loadClients]);

  function updateCreateForm(field: keyof ClientFormState, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditForm(field: keyof ClientFormState, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, "/api/clients"), {
        body: JSON.stringify(createForm),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as ClientResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not create client."));
        return;
      }

      if ("client" in payload) {
        setClients((current) => [payload.client, ...current]);
        setCreateForm(emptyForm);
      }
    } catch {
      setError("Could not create client.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingClient) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/clients/${editingClient.id}`), {
        body: JSON.stringify(editForm),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as ClientResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not update client."));
        return;
      }

      if ("client" in payload) {
        setClients((current) =>
          current.map((client) => (client.id === payload.client.id ? payload.client : client))
        );
        setEditingClient(null);
        setEditForm(emptyForm);
      }
    } catch {
      setError("Could not update client.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteClient(client: ClientRecord) {
    if (!canDelete || !window.confirm(`Delete ${client.name}?`)) {
      return;
    }

    setDeletingId(client.id);
    setError(null);

    try {
      const response = await fetch(getApiPath(apiBasePath, `/api/clients/${client.id}`), {
        method: "DELETE"
      });
      const payload = (await response.json()) as ClientResponse | ErrorResponse;

      if (!response.ok) {
        setError(getErrorMessage(payload, "Could not delete client."));
        return;
      }

      setClients((current) => current.filter((item) => item.id !== client.id));

      if (editingClient?.id === client.id) {
        setEditingClient(null);
        setEditForm(emptyForm);
      }
    } catch {
      setError("Could not delete client.");
    } finally {
      setDeletingId(null);
    }
  }

  function startEditing(client: ClientRecord) {
    setEditingClient(client);
    setEditForm(formFromClient(client));
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Clients</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Client list
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Create the client once, then reuse them across jobs, quotes, and invoices.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active clients</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{clientCount}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <form
            className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
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
                placeholder="Search by name, email, phone, or job type"
                value={search}
              />
            </label>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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

          <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading clients
              </div>
            ) : clients.length === 0 ? (
              <div className="min-h-64 px-6 py-12 text-center">
                <h2 className="text-lg font-semibold text-slate-950">No clients found</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {appliedSearch
                    ? "Try a different search, or add the client if they are new."
                    : "Create your first client to start building the workflow from client to quote, job, and invoice."}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Client</th>
                        <th className="px-4 py-3 font-semibold">Contact</th>
                        <th className="px-4 py-3 font-semibold">Activity</th>
                        <th className="px-4 py-3 font-semibold">Created</th>
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {clients.map((client) => (
                        <tr className="align-top" key={client.id}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-950">{client.name}</p>
                            {client.address ? (
                              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                                {client.address}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            <p>{client.email || "No email"}</p>
                            <p className="mt-1 text-xs text-slate-500">{client.phone || "No phone"}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            <p>{client._count?.jobs ?? 0} jobs</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {client._count?.quotes ?? 0} quotes, {client._count?.invoices ?? 0} invoices
                            </p>
                            {client.jobType ? (
                              <p className="mt-1 text-xs text-slate-500">{client.jobType}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-slate-600">{formatDate(client.createdAt)}</td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                                onClick={() => startEditing(client)}
                                title="Edit client"
                                type="button"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              {canDelete ? (
                                <button
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={deletingId === client.id}
                                  onClick={() => void deleteClient(client)}
                                  title="Delete client"
                                  type="button"
                                >
                                  {deletingId === client.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-200 md:hidden">
                  {clients.map((client) => (
                    <article className="space-y-3 p-4" key={client.id}>
                      <div>
                        <h2 className="text-base font-semibold text-slate-950">{client.name}</h2>
                        <p className="mt-1 text-sm text-slate-600">{client.jobType || "Job type not set"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {client._count?.jobs ?? 0} jobs, {client._count?.quotes ?? 0} quotes,{" "}
                          {client._count?.invoices ?? 0} invoices
                        </p>
                      </div>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>{client.email || "No email"}</p>
                        <p>{client.phone || "No phone"}</p>
                        {client.address ? <p>{client.address}</p> : null}
                        <p>Created {formatDate(client.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => startEditing(client)}
                          type="button"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                        {canDelete ? (
                          <button
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={deletingId === client.id}
                            onClick={() => void deleteClient(client)}
                            type="button"
                          >
                            {deletingId === client.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </>
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
              <h2 className="text-base font-semibold text-slate-950">Create client</h2>
            </div>
            <ClientFields disabled={isSaving} form={createForm} onChange={updateCreateForm} />
            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create client
            </button>
          </form>

          <div
            className={cn(
              "rounded-md border border-slate-200 bg-white p-4 shadow-sm",
              !editingClient && "hidden xl:block"
            )}
          >
            {editingClient ? (
              <form onSubmit={(event) => void submitEdit(event)}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-slate-500" />
                    <h2 className="text-base font-semibold text-slate-950">Edit client</h2>
                  </div>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50"
                    onClick={() => {
                      setEditingClient(null);
                      setEditForm(emptyForm);
                    }}
                    title="Close edit form"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ClientFields disabled={isSaving} form={editForm} onChange={updateEditForm} />
                <button
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                  Save changes
                </button>
              </form>
            ) : (
              <div className="py-8 text-center">
                <h2 className="text-base font-semibold text-slate-950">No client selected</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose a client from the list to edit their contact details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

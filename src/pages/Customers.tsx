import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { endpoints } from "../lib/api";
import type { Contact, Customer, CustomerPortalAccess, ServiceLocation, User } from "../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  TextArea,
} from "../components/ui";
import { Attachments } from "../components/Attachments";
import { useMemo } from "react";

export function CustomersPage() {
  const { user } = useOutletContext<{ user: User | null }>();
  const canManagePortal = Boolean(user && ["owner", "admin"].includes(user.role));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importHistoryOpen, setImportHistoryOpen] = useState(false);
  const [selectedImport, setSelectedImport] =
    useState<CustomerImportDetail | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);

  async function load(value = query) {
    setLoading(true);
    setError("");

    try {
      const queryString = value
        ? "q=" + encodeURIComponent(value) + "&limit=100"
        : "limit=100";
      setCustomers(await endpoints.customers.list(queryString));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load customers",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Customer relationship management"
        title="Customers"
        description="A customer record anchors service locations, equipment, agreements and billing."
        actions={
          <div className="page-actions">
            <Button
              className="btn-secondary"
              onClick={() => setImportHistoryOpen(true)}
            >
              Import history
            </Button>
            <Button
              className="btn-secondary"
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </Button>
            <Button onClick={() => setModal(true)}>Add customer</Button>
          </div>
        }
      />
      <div className="toolbar card">
        <Input
          aria-label="Search customers"
          placeholder="Search by customer name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <Button onClick={() => void load()}>Search</Button>
      </div>
      {error && <div className="error-banner page-error">{error}</div>}
      <Card>
        <div className="table-head">
          <strong>{customers.length} customers</strong>
          <span className="muted">Tenant-scoped live data</span>
        </div>
        {loading ? (
          <div className="center-load">
            <Spinner />
          </div>
        ) : customers.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <button
                        className="table-link"
                        onClick={() => setSelected(customer)}
                      >
                        <strong>{customer.name}</strong>
                        <span>{customer.customer_number}</span>
                      </button>
                    </td>
                    <td className="capitalize">{customer.kind}</td>
                    <td>{customer.email || customer.phone || "—"}</td>
                    <td>
                      <Badge
                        tone={
                          customer.status === "active" ? "success" : "neutral"
                        }
                      >
                        {customer.status}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setSelected(customer)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No customers"
            description="Create a customer to start connecting service work."
          />
        )}
      </Card>
      {modal && (
        <CustomerModal
          customers={customers}
          onClose={() => setModal(false)}
          onCreated={(customer) => {
            setCustomers((current) => [customer, ...current]);
            setModal(false);
            setSelected(customer);
          }}
        />
      )}
      {importOpen && (
        <CustomerImportModal
          onClose={() => setImportOpen(false)}
          onCompleted={async () => {
            setImportOpen(false);
            await load("");
          }}
        />
      )}
      {importHistoryOpen && (
        <CustomerImportHistoryModal
          onClose={() => setImportHistoryOpen(false)}
          onOpenJob={(job) => {
            setImportHistoryOpen(false);
            setSelectedImport(job);
          }}
        />
      )}
      {selectedImport && (
        <CustomerImportJobModal
          job={selectedImport}
          onClose={() => {
            setSelectedImport(null);
            void load("");
          }}
        />
      )}
      {selected && (
        <CustomerDrawer
          customers={customers}
          customer={selected}
          canManagePortal={canManagePortal}
          onClose={() => setSelected(null)}
          onChanged={(next) => {
            setCustomers((current) =>
              current.map((item) => (item.id === next.id ? next : item)),
            );
            setSelected(next);
          }}
        />
      )}
    </div>
  );
}

function CustomerModal({
  customers,
  onClose,
  onCreated,
}: {
  customers: Customer[];
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    kind: "residential",
    email: "",
    phone: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const duplicate = customers.find(
      (c) => c.name.toLowerCase().trim() === form.name.toLowerCase().trim(),
    );
    if (duplicate) {
      setBusy(false);
      setError(
        `A customer named "${form.name}" already exists. Customer names must be unique.`,
      );
      return;
    }

    try {
      const customer = await endpoints.customers.create({
        name: form.name,
        kind: form.kind,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      });
      onCreated(customer);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to create customer",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add customer" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Name
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label>
          Customer type
          <Select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </Select>
        </label>
        <div className="form-two">
          <label>
            Email
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Phone
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
        </div>
        <label>
          Notes
          <TextArea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy}>
          {busy ? "Creating…" : "Create customer"}
        </Button>
      </form>
    </Modal>
  );
}

function CustomerDrawer({
  customers,
  customer,
  canManagePortal,
  onClose,
  onChanged,
}: {
  customers: Customer[];
  customer: Customer;
  canManagePortal: boolean;
  onClose: () => void;
  onChanged: (customer: Customer) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [tab, setTab] = useState<"summary" | "contacts" | "locations">(
    "summary",
  );
  const [contactOpen, setContactOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [portalAccess, setPortalAccess] = useState<CustomerPortalAccess | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadDetails() {
    try {
      const [contactsData, locationsData] = await Promise.all([
        endpoints.customers.contacts(customer.id),
        endpoints.customers.locations(customer.id),
      ]);
      setContacts(contactsData);
      setLocations(locationsData);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load customer details",
      );
    }
  }

  useEffect(() => {
    void loadDetails();
  }, [customer.id]);

  useEffect(() => {
    let live = true;
    if (!canManagePortal) return () => { live = false; };
    endpoints.customers.portalAccess(customer.id)
      .then((access) => { if (live) setPortalAccess(access); })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Unable to load portal access status"); });
    return () => { live = false; };
  }, [customer.id, canManagePortal]);

  async function deactivate() {
    if (!window.confirm("Deactivate this customer?")) return;

    try {
      await endpoints.customers.deactivate(customer.id);
      onChanged({ ...customer, status: "inactive" });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to deactivate customer",
      );
    }
  }

  return (
    <Modal title={customer.name} onClose={onClose}>
      <div className="drawer-meta">
        <span>{customer.customer_number}</span>
        <Badge
          tone={customer.status === "active" ? "success" : "neutral"}
        >
          {customer.status}
        </Badge>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="tabs">
        <button
          className={tab === "summary" ? "tab active" : "tab"}
          onClick={() => setTab("summary")}
        >
          Summary
        </button>
        <button
          className={tab === "contacts" ? "tab active" : "tab"}
          onClick={() => setTab("contacts")}
        >
          Contacts ({contacts.length})
        </button>
        <button
          className={tab === "locations" ? "tab active" : "tab"}
          onClick={() => setTab("locations")}
        >
          Locations ({locations.length})
        </button>
      </div>

      {tab === "summary" && (
        <div className="detail-grid">
          <div>
            <span className="eyebrow">Email</span>
            <strong>{customer.email || "Not set"}</strong>
          </div>
          <div>
            <span className="eyebrow">Phone</span>
            <strong>{customer.phone || "Not set"}</strong>
          </div>
          <div className="detail-wide">
            <span className="eyebrow">Notes</span>
            <p className="muted">{customer.notes || "No notes yet."}</p>
          </div>
        </div>
      )}

      {canManagePortal && tab === "summary" && (
        <Card>
          <div className="section-action-row">
            <div>
              <strong>Customer portal access</strong>
              <p className="muted">A customer record does not automatically create a login. Invite the customer only when they need online access.</p>
            </div>
            {portalAccess?.has_access ? (
              <Badge tone="success">Portal enabled</Badge>
            ) : (
              <Badge tone={portalAccess?.invitation_status === "pending" ? "info" : "neutral"}>
                {portalAccess?.invitation_status === "pending" ? "Invitation pending" : "No portal access"}
              </Badge>
            )}
          </div>
          <div className="section-action-row">
            <span className="muted">
              {portalAccess?.has_access
                ? "This customer can sign in to view their own agreements, locations, equipment, work orders and invoices."
                : !customer.email
                  ? "Add an email address to the customer record before inviting them."
                  : portalAccess?.invitation_status === "pending"
                    ? `Invitation sent to ${portalAccess.invited_email || customer.email}.`
                    : portalAccess?.invitation_status === "expired"
                      ? "The previous invitation expired. Send a new one."
                      : "The customer will set their own password from a secure, expiring invitation."}
            </span>
            <Button
              className={portalAccess?.has_access ? "btn-secondary" : "btn-primary"}
              disabled={portalBusy || customer.status !== "active" || !customer.email}
              onClick={async () => {
                setPortalBusy(true);
                setError("");
                try {
                  if (portalAccess?.has_access) {
                    if (!window.confirm("Disable this customer's portal access? Their customer records and invoices will be preserved.")) return;
                    await endpoints.customers.revokePortal(customer.id);
                    setPortalAccess({ has_access: false, invited_email: customer.email, invitation_status: "revoked" });
                  } else {
                    if (portalAccess?.invitation_status === "pending" && !window.confirm("Send a fresh invitation? The current pending link will be revoked.")) return;
                    const invite = await endpoints.customers.invitePortal(customer.id);
                    setPortalAccess({ has_access: false, invited_email: invite.email, invitation_status: "pending" });
                  }
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Unable to update customer portal access");
                } finally {
                  setPortalBusy(false);
                }
              }}
            >
              {portalBusy ? "Working…" : portalAccess?.has_access ? "Disable portal access" : portalAccess?.invitation_status === "pending" ? "Resend invitation" : "Invite to portal"}
            </Button>
          </div>
        </Card>
      )}
      {tab === "contacts" && (
        <div>
          <div className="section-action-row">
            <span className="muted">People connected to this account.</span>
            <Button
              className="btn-secondary"
              onClick={() => setContactOpen(true)}
            >
              Add contact
            </Button>
          </div>
          <div className="list">
            {contacts.length ? (
              contacts.map((contact) => (
                <div className="list-row" key={contact.id}>
                  <div>
                    <strong>{contact.full_name}</strong>
                    <span>
                      {contact.email || contact.phone || "No contact detail"}
                    </span>
                  </div>
                  {contact.is_billing_contact && (
                    <Badge tone="info">Billing</Badge>
                  )}
                </div>
              ))
            ) : (
              <EmptyState
                title="No contacts"
                description="Add a billing or service contact for this customer."
              />
            )}
          </div>
        </div>
      )}

      {tab === "locations" && (
        <div>
          <div className="section-action-row">
            <span className="muted">Places where work is performed.</span>
            <Button
              className="btn-secondary"
              onClick={() => setLocationOpen(true)}
            >
              Add location
            </Button>
          </div>
          <div className="list">
            {locations.length ? (
              locations.map((location) => (
                <div className="list-row" key={location.id}>
                  <div>
                    <strong>{location.name}</strong>
                    <span>
                      {location.address_line1}, {location.city}
                      {location.region ? ", " + location.region : ""}
                    </span>
                  </div>
                  <Badge
                    tone={location.is_active ? "success" : "neutral"}
                  >
                    {location.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState
                title="No service locations"
                description="Create a location before scheduling field work."
              />
            )}
          </div>
        </div>
      )}

      <Attachments entityType="customer" entityId={customer.id} />
      <div className="modal-actions">
        <Button
          className="btn-secondary"
          onClick={() => setEditOpen(true)}
        >
          Edit customer
        </Button>
        {customer.status === "active" && (
          <Button
            className="btn-danger"
            onClick={() => void deactivate()}
          >
            Deactivate customer
          </Button>
        )}
      </div>

      {contactOpen && (
        <ContactModal
          customerId={customer.id}
          onClose={() => setContactOpen(false)}
          onCreated={(contact) => {
            setContacts((current) => [...current, contact]);
            setContactOpen(false);
          }}
        />
      )}
      {locationOpen && (
        <LocationModal
          customerId={customer.id}
          onClose={() => setLocationOpen(false)}
          onCreated={(location) => {
            setLocations((current) => [...current, location]);
            setLocationOpen(false);
          }}
        />
      )}
      {editOpen && (
        <CustomerEditModal
          customers={customers}
          customer={customer}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated) => {
            onChanged(updated);
            setEditOpen(false);
          }}
        />
      )}
    </Modal>
  );
}

function CustomerEditModal({
  customers,
  customer,
  onClose,
  onUpdated,
}: {
  customers: Customer[];
  customer: Customer;
  onClose: () => void;
  onUpdated: (customer: Customer) => void;
}) {
  const [form, setForm] = useState({
    name: customer.name,
    kind: customer.kind,
    email: customer.email || "",
    phone: customer.phone || "",
    notes: customer.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const duplicate = customers.find(
      (c) =>
        c.id !== customer.id &&
        c.name.toLowerCase().trim() === form.name.toLowerCase().trim(),
    );
    if (duplicate) {
      setBusy(false);
      setError(
        `A customer named "${form.name}" already exists. Customer names must be unique.`,
      );
      return;
    }

    try {
      onUpdated(
        await endpoints.customers.update(customer.id, {
          name: form.name,
          kind: form.kind,
          email: form.email || null,
          phone: form.phone || null,
          notes: form.notes || null,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update customer",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit customer" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Name
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            minLength={1}
            required
          />
        </label>
        <label>
          Customer type
          <Select
            value={form.kind}
            onChange={(event) =>
              setForm({
                ...form,
                kind: event.target.value as Customer["kind"],
              })
            }
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </Select>
        </label>
        <div className="form-two">
          <label>
            Email
            <Input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          <label>
            Phone
            <Input
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </label>
        </div>
        <label>
          Notes
          <TextArea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </label>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy}>
          {busy ? "Saving…" : "Save customer"}
        </Button>
      </form>
    </Modal>
  );
}

function ContactModal({
  customerId,
  onClose,
  onCreated,
}: {
  customerId: string;
  onClose: () => void;
  onCreated: (contact: Contact) => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    billing: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const contact = await endpoints.customers.addContact(customerId, {
        full_name: form.fullName,
        email: form.email || null,
        phone: form.phone || null,
        is_billing_contact: form.billing,
      });
      onCreated(contact);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to add contact",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add contact" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Full name
          <Input
            value={form.fullName}
            onChange={(event) =>
              setForm({ ...form, fullName: event.target.value })
            }
            required
          />
        </label>
        <div className="form-two">
          <label>
            Email
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Phone
            <Input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.billing}
            onChange={(event) =>
              setForm({ ...form, billing: event.target.checked })
            }
          />{" "}
          Billing contact
        </label>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy}>{busy ? "Adding…" : "Add contact"}</Button>
      </form>
    </Modal>
  );
}

function LocationModal({
  customerId,
  onClose,
  onCreated,
}: {
  customerId: string;
  onClose: () => void;
  onCreated: (location: ServiceLocation) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    address1: "",
    address2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "US",
    access: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const location = await endpoints.customers.addLocation(customerId, {
        name: form.name,
        address_line1: form.address1,
        address_line2: form.address2 || null,
        city: form.city,
        region: form.region || null,
        postal_code: form.postalCode || null,
        country_code: form.country.toUpperCase(),
        access_instructions: form.access || null,
      });
      onCreated(location);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to add service location",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add service location" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Location name
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </label>
        <label>
          Address line 1
          <Input
            value={form.address1}
            onChange={(event) =>
              setForm({ ...form, address1: event.target.value })
            }
            required
          />
        </label>
        <label>
          Address line 2
          <Input
            value={form.address2}
            onChange={(event) =>
              setForm({ ...form, address2: event.target.value })
            }
          />
        </label>
        <div className="form-two">
          <label>
            City
            <Input
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
              required
            />
          </label>
          <label>
            Region/state
            <Input
              value={form.region}
              onChange={(event) =>
                setForm({ ...form, region: event.target.value })
              }
            />
          </label>
        </div>
        <div className="form-two">
          <label>
            Postal code
            <Input
              value={form.postalCode}
              onChange={(event) =>
                setForm({ ...form, postalCode: event.target.value })
              }
            />
          </label>
          <label>
            Country code
            <Input
              maxLength={2}
              value={form.country}
              onChange={(event) =>
                setForm({ ...form, country: event.target.value })
              }
              required
            />
          </label>
        </div>
        <label>
          Access instructions
          <Input
            value={form.access}
            onChange={(event) => setForm({ ...form, access: event.target.value })}
          />
        </label>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy}>
          {busy ? "Creating…" : "Create location"}
        </Button>
      </form>
    </Modal>
  );
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"' && text[i + 1] === '"' && quoted) {
      cell += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  if (rows.length < 2) return [];

  const headers = rows[0].map((value) => value.trim().toLowerCase());
  return rows.slice(1).map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, (values[index] || "").trim()]),
    ),
  );
}

function CustomerImportModal({
  onClose,
  onCompleted,
}: {
  onClose: () => void;
  onCompleted: () => Promise<void>;
}) {
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [preview, setPreview] = useState<{
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    rows: Array<{
      row_number: number;
      valid: boolean;
      error_message: string | null;
    }>;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = useMemo(
    () =>
      rows.map((row) => ({
        name: row.name || "",
        kind: row.kind || "residential",
        email: row.email || null,
        phone: row.phone || null,
        notes: row.notes || null,
      })),
    [rows],
  );

  async function choose(file: File) {
    setError("");

    try {
      const parsed = parseCsv(await file.text());
      if (!parsed.length) {
        throw new Error(
          "The CSV must contain a header row and at least one customer.",
        );
      }
      setRows(parsed);
      const result = (await endpoints.imports.previewCustomers(
        parsed,
      )) as typeof preview;
      setPreview(result);
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to read CSV");
    }
  }

  async function importRows() {
    setBusy(true);
    setError("");

    try {
      await endpoints.imports.createCustomers(
        fields,
        "sam-import-" + crypto.randomUUID(),
      );
      await onCompleted();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to import customers");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Import customers from CSV" onClose={onClose}>
      <div className="form-grid">
        <div className="import-help">
          Expected columns: <strong>name</strong>, <strong>kind</strong>,{" "}
          <strong>email</strong>, <strong>phone</strong>, <strong>notes</strong>.
          Maximum 2,000 rows.
        </div>
        <label className="btn file-btn">
          Choose CSV
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void choose(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {preview && (
          <div className="import-stats">
            <strong>{preview.valid_rows} valid</strong>
            <span>
              {preview.invalid_rows} invalid of {preview.total_rows}
            </span>
          </div>
        )}
        {preview && preview.invalid_rows > 0 && (
          <div className="import-errors">
            {preview.rows
              .filter((item) => !item.valid)
              .slice(0, 8)
              .map((item) => (
                <div key={item.row_number}>
                  Row {item.row_number}: {item.error_message || "Invalid row"}
                </div>
              ))}
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
        <Button
          disabled={!preview || preview.valid_rows === 0 || busy}
          onClick={() => void importRows()}
        >
          {busy ? "Importing…" : "Import valid customers"}
        </Button>
      </div>
    </Modal>
  );
}

type CustomerImportJob = {
  id: string;
  status: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerImportRow = {
  id: string;
  row_number: number;
  status: string;
  payload: {
    name?: string;
    kind?: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  };
  customer_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerImportDetail = CustomerImportJob & { rows: CustomerImportRow[] };

function importStatusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" {
  if (status === "completed" || status === "imported") return "success";
  if (
    status === "partial" ||
    status === "processing" ||
    status === "pending"
  ) {
    return "warning";
  }
  if (status === "failed") return "danger";
  return "neutral";
}

function CustomerImportHistoryModal({
  onClose,
  onOpenJob,
}: {
  onClose: () => void;
  onOpenJob: (job: CustomerImportDetail) => void;
}) {
  const [items, setItems] = useState<CustomerImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    endpoints.imports
      .listCustomers()
      .then((result) => {
        if (live) setItems(result as CustomerImportJob[]);
      })
      .catch((cause) => {
        if (live) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load import history",
          );
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, []);

  async function openJob(job: CustomerImportJob) {
    setError("");

    try {
      onOpenJob(
        (await endpoints.imports.getCustomerImport(
          job.id,
        )) as CustomerImportDetail,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to open import details",
      );
    }
  }

  return (
    <Modal title="Customer import history" onClose={onClose}>
      <p className="muted">
        Review completed imports, find failed rows and retry corrected data.
      </p>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="center-load">
          <Spinner />
        </div>
      ) : items.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Status</th>
                <th>Imported</th>
                <th>Failed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id}>
                  <td>{new Date(job.created_at).toLocaleString()}</td>
                  <td>
                    <Badge tone={importStatusTone(job.status)}>
                      {job.status}
                    </Badge>
                  </td>
                  <td>
                    {job.imported_rows}/{job.total_rows}
                  </td>
                  <td>{job.failed_rows}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => void openJob(job)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No import jobs"
          description="Customer CSV imports and their results will appear here."
        />
      )}
    </Modal>
  );
}

function CustomerImportJobModal({
  job: initialJob,
  onClose,
}: {
  job: CustomerImportDetail;
  onClose: () => void;
}) {
  const [job, setJob] = useState<CustomerImportDetail>(initialJob);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CustomerImportRow | null>(null);

  async function reload() {
    setLoading(true);
    setError("");

    try {
      setJob(
        (await endpoints.imports.getCustomerImport(
          job.id,
        )) as CustomerImportDetail,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to refresh import details",
      );
    } finally {
      setLoading(false);
    }
  }

  async function retry() {
    setBusy(true);
    setError("");

    try {
      await endpoints.imports.retryCustomers(job.id);
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to retry customer import",
      );
    } finally {
      setBusy(false);
    }
  }

  const canRetry =
    job.rows.some((row) => row.status === "pending") || job.failed_rows > 0;

  return (
    <Modal title="Review customer import" onClose={onClose}>
      <div className="import-stats">
        <strong>{job.imported_rows} imported</strong>
        <span>
          {job.failed_rows} failed of {job.total_rows} rows
        </span>
        <Badge tone={importStatusTone(job.status)}>{job.status}</Badge>
      </div>
      <div className="import-job-summary">
        <span>Created {new Date(job.created_at).toLocaleString()}</span>
        <span>
          Job ID <code>{job.id}</code>
        </span>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="center-load">
          <Spinner />
        </div>
      ) : job.rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Issue</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {job.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.row_number}</td>
                  <td>
                    <strong>{row.payload.name || "Unnamed"}</strong>
                    <span className="table-sub">
                      {row.payload.email || row.payload.phone || "No contact"}
                    </span>
                  </td>
                  <td>
                    <Badge tone={importStatusTone(row.status)}>
                      {row.status}
                    </Badge>
                  </td>
                  <td>{row.error_message || "—"}</td>
                  <td>
                    {row.status !== "imported" && (
                      <button
                        className="text-button"
                        onClick={() => setEditing(row)}
                      >
                        Correct
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No import rows"
          description="This job does not contain row details."
        />
      )}
      <div className="modal-actions">
        <Button
          className="btn-secondary"
          onClick={() => void reload()}
          disabled={busy || loading}
        >
          Refresh
        </Button>
        {canRetry && (
          <Button
            onClick={() => void retry()}
            disabled={busy || loading}
          >
            {busy ? "Retrying…" : "Retry pending rows"}
          </Button>
        )}
      </div>
      {editing && (
        <CustomerImportRowModal
          jobId={job.id}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}
    </Modal>
  );
}

function CustomerImportRowModal({
  jobId,
  row,
  onClose,
  onSaved,
}: {
  jobId: string;
  row: CustomerImportRow;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: row.payload.name || "",
    kind: row.payload.kind || "residential",
    email: row.payload.email || "",
    phone: row.payload.phone || "",
    notes: row.payload.notes || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await endpoints.imports.updateCustomerImportRow(jobId, row.id, {
        name: form.name,
        kind: form.kind,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      });
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to correct import row",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Correct import row ${row.row_number}`}
      onClose={onClose}
    >
      <form className="form-grid" onSubmit={submit}>
        <label>
          Customer name
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            minLength={1}
            required
          />
        </label>
        <label>
          Customer type
          <Select
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value })}
          >
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </Select>
        </label>
        <div className="form-two">
          <label>
            Email
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Phone
            <Input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </label>
        </div>
        <label>
          Notes
          <TextArea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </label>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <Button disabled={busy}>
          {busy ? "Saving…" : "Save corrected row"}
        </Button>
      </form>
    </Modal>
  );
}

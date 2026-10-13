import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import type { Contact, Customer, ServiceLocation } from "../types";
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, TextArea } from "../components/ui";
import { Attachments } from "../components/Attachments";
import { useMemo } from "react";

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  async function load(value = query) {
    setLoading(true); setError("");
    try {
      const queryString = value ? "q=" + encodeURIComponent(value) + "&limit=100" : "limit=100";
      setCustomers(await endpoints.customers.list(queryString));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load customers"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(""); }, []);

  return <div>
    <PageHeader eyebrow="Customer relationship management" title="Customers" description="A customer record anchors service locations, equipment, agreements and billing." actions={<div className="page-actions"><Button className="btn-secondary" onClick={() => setImportOpen(true)}>Import CSV</Button><Button onClick={() => setModal(true)}>Add customer</Button></div>} />
    <div className="toolbar card"><Input aria-label="Search customers" placeholder="Search by customer name" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void load(); }} /><Button onClick={() => void load()}>Search</Button></div>
    {error && <div className="error-banner page-error">{error}</div>}
    <Card>
      <div className="table-head"><strong>{customers.length} customers</strong><span className="muted">Tenant-scoped live data</span></div>
      {loading ? <div className="center-load"><Spinner /></div> : customers.length ? <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Type</th><th>Contact</th><th>Status</th><th /></tr></thead><tbody>
        {customers.map(customer => <tr key={customer.id}><td><button className="table-link" onClick={() => setSelected(customer)}><strong>{customer.name}</strong><span>{customer.customer_number}</span></button></td><td className="capitalize">{customer.kind}</td><td>{customer.email || customer.phone || "—"}</td><td><Badge tone={customer.status === "active" ? "success" : "neutral"}>{customer.status}</Badge></td><td><button className="text-button" onClick={() => setSelected(customer)}>Open</button></td></tr>)}
      </tbody></table></div> : <EmptyState title="No customers" description="Create a customer to start connecting service work." />}
    </Card>
    {modal && <CustomerModal onClose={() => setModal(false)} onCreated={customer => { setCustomers(current => [customer, ...current]); setModal(false); setSelected(customer); }} />}
    {importOpen && <CustomerImportModal onClose={() => setImportOpen(false)} onCompleted={async () => { setImportOpen(false); await load(""); }} />}
    {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} onChanged={next => { setCustomers(current => current.map(item => item.id === next.id ? next : item)); setSelected(next); }} />}
  </div>;
}

function CustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (customer: Customer) => void }) {
  const [form, setForm] = useState({ name: "", kind: "residential", email: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const customer = await endpoints.customers.create({ name: form.name, kind: form.kind, email: form.email || null, phone: form.phone || null, notes: form.notes || null });
      onCreated(customer);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create customer"); }
    finally { setBusy(false); }
  }
  return <Modal title="Add customer" onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <label>Name<Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
    <label>Customer type<Select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}><option value="residential">Residential</option><option value="commercial">Commercial</option></Select></label>
    <div className="form-two"><label>Email<Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Phone<Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label></div>
    <label>Notes<TextArea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
    {error && <div className="error-banner">{error}</div>}<Button disabled={busy}>{busy ? "Creating…" : "Create customer"}</Button>
  </form></Modal>;
}

function CustomerDrawer({ customer, onClose, onChanged }: { customer: Customer; onClose: () => void; onChanged: (customer: Customer) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [tab, setTab] = useState<"summary" | "contacts" | "locations">("summary");
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([endpoints.customers.contacts(customer.id), endpoints.customers.locations(customer.id)]).then(([contactsData, locationsData]) => { setContacts(contactsData); setLocations(locationsData); }).catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load customer details")); }, [customer.id]);
  async function deactivate() {
    if (!window.confirm("Deactivate this customer?")) return;
    try { await endpoints.customers.deactivate(customer.id); onChanged({ ...customer, status: "inactive" }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to deactivate customer"); }
  }
  return <Modal title={customer.name} onClose={onClose}>
    <div className="drawer-meta"><span>{customer.customer_number}</span><Badge tone={customer.status === "active" ? "success" : "neutral"}>{customer.status}</Badge></div>
    {error && <div className="error-banner">{error}</div>}
    <div className="tabs"><button className={tab === "summary" ? "tab active" : "tab"} onClick={() => setTab("summary")}>Summary</button><button className={tab === "contacts" ? "tab active" : "tab"} onClick={() => setTab("contacts")}>Contacts ({contacts.length})</button><button className={tab === "locations" ? "tab active" : "tab"} onClick={() => setTab("locations")}>Locations ({locations.length})</button></div>
    {tab === "summary" && <div className="detail-grid"><div><span className="eyebrow">Email</span><strong>{customer.email || "Not set"}</strong></div><div><span className="eyebrow">Phone</span><strong>{customer.phone || "Not set"}</strong></div><div className="detail-wide"><span className="eyebrow">Notes</span><p className="muted">{customer.notes || "No notes yet."}</p></div></div>}
    {tab === "contacts" && <div className="list">{contacts.length ? contacts.map(contact => <div className="list-row" key={contact.id}><div><strong>{contact.full_name}</strong><span>{contact.email || contact.phone || "No contact detail"}</span></div>{contact.is_billing_contact && <Badge tone="info">Billing</Badge>}</div>) : <EmptyState title="No contacts" description="No contacts are configured for this customer yet." />}</div>}
    {tab === "locations" && <div className="list">{locations.length ? locations.map(location => <div className="list-row" key={location.id}><div><strong>{location.name}</strong><span>{location.address_line1}, {location.city}{location.region ? ", " + location.region : ""}</span></div><Badge tone={location.is_active ? "success" : "neutral"}>{location.is_active ? "Active" : "Inactive"}</Badge></div>) : <EmptyState title="No service locations" description="Create a location before scheduling field work." />}</div>}
    <Attachments entityType="customer" entityId={customer.id}/><div className="modal-actions">{customer.status === "active" && <Button className="btn-danger" onClick={() => void deactivate()}>Deactivate customer</Button>}</div>
  </Modal>;
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
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }

  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.some(value => value.trim() !== "")) rows.push(row);
  }
  if (rows.length < 2) return [];

  const headers = rows[0].map(value => value.trim().toLowerCase());
  return rows.slice(1).map(values =>
    Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()])),
  );
}

function CustomerImportModal({onClose,onCompleted}:{onClose:()=>void;onCompleted:()=>Promise<void>}){
  const [rows,setRows]=useState<Array<Record<string,string>>>([]);
  const [preview,setPreview]=useState<{total_rows:number;valid_rows:number;invalid_rows:number;rows:Array<{row_number:number;valid:boolean;error_message:string|null}>}|null>(null);
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const fields=useMemo(()=>rows.map(row=>({name:row.name||"",kind:row.kind||"residential",email:row.email||null,phone:row.phone||null,notes:row.notes||null})),[rows]);
  async function choose(file:File){setError("");try{const parsed=parseCsv(await file.text());if(!parsed.length)throw new Error("The CSV must contain a header row and at least one customer.");setRows(parsed);const result=await endpoints.imports.previewCustomers(parsed) as typeof preview;setPreview(result)}catch(c){setError(c instanceof Error?c.message:"Unable to read CSV")}}
  async function importRows(){setBusy(true);setError("");try{await endpoints.imports.createCustomers(fields,"sam-import-"+crypto.randomUUID());await onCompleted()}catch(c){setError(c instanceof Error?c.message:"Unable to import customers")}finally{setBusy(false)}}
  return <Modal title="Import customers from CSV" onClose={onClose}><div className="form-grid"><div className="import-help">Expected columns: <strong>name</strong>, <strong>kind</strong>, <strong>email</strong>, <strong>phone</strong>, <strong>notes</strong>. Maximum 2,000 rows.</div><label className="btn file-btn">Choose CSV<input type="file" accept=".csv,text/csv" hidden onChange={event=>{const file=event.target.files?.[0];if(file)void choose(file);event.currentTarget.value=""}}/></label>{preview&&<div className="import-stats"><strong>{preview.valid_rows} valid</strong><span>{preview.invalid_rows} invalid of {preview.total_rows}</span></div>}{preview&&preview.invalid_rows>0&&<div className="import-errors">{preview.rows.filter(item=>!item.valid).slice(0,8).map(item=><div key={item.row_number}>Row {item.row_number}: {item.error_message||"Invalid row"}</div>)}</div>}{error&&<div className="error-banner">{error}</div>}<Button disabled={!preview||preview.valid_rows===0||busy} onClick={()=>void importRows()}>{busy?"Importing…":"Import valid customers"}</Button></div></Modal>;
}

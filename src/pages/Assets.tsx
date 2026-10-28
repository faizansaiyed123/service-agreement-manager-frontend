import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import type { Customer, Equipment, ServiceCatalogItem, ServiceLocation } from "../types";
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, TextArea } from "../components/ui";

const equipmentStatusTone = (status: Equipment["status"]) =>
  status === "active" ? "success" : status === "decommissioned" ? "danger" : "neutral";

export function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [equipment, customerData] = await Promise.all([
        endpoints.equipment.list("limit=100"),
        endpoints.customers.list("limit=100"),
      ]);
      setItems(equipment);
      setCustomers(customerData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load equipment");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = items.filter(item => {
    const haystack = [item.asset_number, item.category, item.serial_number, item.manufacturer, item.model_number]
      .filter(Boolean).join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (!status || item.status === status);
  });

  return <div>
    <PageHeader eyebrow="Assets" title="Equipment" description="Keep serviceable assets attached to the right customer and service location." actions={<Button onClick={() => setCreateOpen(true)}>Add equipment</Button>} />
    <div className="toolbar card">
      <Input aria-label="Search equipment" placeholder="Search asset, manufacturer, model or serial number" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void load(); }} />
      <Select aria-label="Filter equipment status" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="decommissioned">Decommissioned</option>
      </Select>
    </div>
    {error && <div className="error-banner page-error" role="alert">{error}</div>}
    <Card>
      <div className="table-head"><strong>{visible.length} equipment records</strong><span className="muted">Edit asset details and service status</span></div>
      {loading ? <div className="center-load"><Spinner /></div> : visible.length ? <div className="table-wrap"><table><thead><tr><th>Asset</th><th>Customer</th><th>Category</th><th>Serial</th><th>Status</th><th /></tr></thead><tbody>
        {visible.map(item => <tr key={item.id}>
          <td><strong>{item.asset_number}</strong><span className="table-sub">{item.model_number || item.manufacturer || "Equipment"}</span></td>
          <td>{customers.find(customer => customer.id === item.customer_id)?.name || "Customer"}</td>
          <td className="capitalize">{item.category}</td><td>{item.serial_number || "—"}</td>
          <td><Badge tone={equipmentStatusTone(item.status)}>{item.status}</Badge></td>
          <td><button className="text-button" onClick={() => setEditing(item)}>Edit</button></td>
        </tr>)}
      </tbody></table></div> : <EmptyState title="No equipment found" description={query || status ? "Try another search or status filter." : "Add a serviceable asset to connect field work to customer equipment."} />}
    </Card>
    {createOpen && <EquipmentModal customers={customers} onClose={() => setCreateOpen(false)} onSaved={item => { setItems(current => [item, ...current.filter(existing => existing.id !== item.id)]); setCreateOpen(false); }} />}
    {editing && <EquipmentModal item={editing} customers={customers} onClose={() => setEditing(null)} onSaved={item => { setItems(current => current.map(existing => existing.id === item.id ? item : existing)); setEditing(null); }} />}
  </div>;
}

function EquipmentModal({ item, customers, onClose, onSaved }: { item?: Equipment; customers: Customer[]; onClose: () => void; onSaved: (item: Equipment) => void }) {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [form, setForm] = useState({
    customerId: item?.customer_id || customers[0]?.id || "",
    locationId: item?.service_location_id || "",
    category: item?.category || "",
    manufacturer: item?.manufacturer || "",
    modelNumber: item?.model_number || "",
    serialNumber: item?.serial_number || "",
    installedOn: item?.installed_on || "",
    warrantyExpiresOn: item?.warranty_expires_on || "",
    status: item?.status || "active",
    notes: item?.notes || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.customerId) return;
    let live = true;
    endpoints.customers.locations(form.customerId).then(nextLocations => {
      if (!live) return;
      setLocations(nextLocations);
      setForm(current => ({
        ...current,
        locationId: current.locationId && nextLocations.some(location => location.id === current.locationId)
          ? current.locationId
          : nextLocations[0]?.id || "",
      }));
    }).catch(cause => { if (live) setError(cause instanceof Error ? cause.message : "Unable to load service locations"); });
    return () => { live = false; };
  }, [form.customerId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      category: form.category,
      manufacturer: form.manufacturer || null,
      model_number: form.modelNumber || null,
      serial_number: form.serialNumber || null,
      installed_on: form.installedOn || null,
      warranty_expires_on: form.warrantyExpiresOn || null,
      notes: form.notes || null,
    };
    try {
      const saved = item
        ? await endpoints.equipment.update(item.id, { ...body, status: form.status }) as Equipment
        : await endpoints.equipment.create({ ...body, customer_id: form.customerId, service_location_id: form.locationId || null }) as Equipment;
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to ${item ? "save" : "create"} equipment`);
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={item ? `Edit equipment · ${item.asset_number}` : "Add equipment"} onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      {!item && <div className="form-two">
        <label>Customer<Select value={form.customerId} onChange={event => setForm({ ...form, customerId: event.target.value, locationId: "" })} required>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></label>
        <label>Service location<Select value={form.locationId} onChange={event => setForm({ ...form, locationId: event.target.value })} required>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></label>
      </div>}
      {item && <div className="form-two"><div><span className="eyebrow">Customer</span><strong>{customers.find(customer => customer.id === item.customer_id)?.name || "Customer"}</strong></div><div><span className="eyebrow">Service location</span><strong>{locations.find(location => location.id === item.service_location_id)?.name || "Current location"}</strong></div></div>}
      <label>Category<Input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} minLength={2} required /></label>
      <div className="form-three">
        <label>Manufacturer<Input value={form.manufacturer} onChange={event => setForm({ ...form, manufacturer: event.target.value })} /></label>
        <label>Model number<Input value={form.modelNumber} onChange={event => setForm({ ...form, modelNumber: event.target.value })} /></label>
        <label>Serial number<Input value={form.serialNumber} onChange={event => setForm({ ...form, serialNumber: event.target.value })} /></label>
      </div>
      <div className="form-two">
        <label>Installed on<Input type="date" value={form.installedOn} onChange={event => setForm({ ...form, installedOn: event.target.value })} /></label>
        <label>Warranty expires<Input type="date" value={form.warrantyExpiresOn} onChange={event => setForm({ ...form, warrantyExpiresOn: event.target.value })} /></label>
      </div>
      {item && <label>Status<Select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as Equipment["status"] })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="decommissioned">Decommissioned</option></Select></label>}
      <label>Notes<TextArea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <Button disabled={busy || (!item && (!form.customerId || !form.locationId))}>{busy ? "Saving…" : item ? "Save equipment" : "Create equipment"}</Button>
    </form>
  </Modal>;
}

export function CatalogPage() {
  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalogItem | null>(null);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await endpoints.catalog.list(`include_inactive=${showInactive}&limit=100`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load service catalog");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [showInactive]);

  const visible = items.filter(item => !query || (item.service_code + " " + item.name + " " + item.category).toLowerCase().includes(query.toLowerCase()));

  return <div>
    <PageHeader eyebrow="Pricing" title="Service catalog" description="Maintain reusable service codes and prices without changing historical agreement snapshots." actions={<Button onClick={() => setCreateOpen(true)}>Add service</Button>} />
    <div className="toolbar card"><Input aria-label="Search service catalog" placeholder="Search by code, name or category" value={query} onChange={event => setQuery(event.target.value)} /><label className="checkbox-label"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} /> Include inactive</label></div>
    {error && <div className="error-banner page-error" role="alert">{error}</div>}
    <Card>
      <div className="table-head"><strong>{visible.length} service items</strong><span className="muted">Historical agreements retain their pricing snapshot</span></div>
      {loading ? <div className="center-load"><Spinner /></div> : visible.length ? <div className="table-wrap"><table><thead><tr><th>Code</th><th>Service</th><th>Category</th><th>Price</th><th>Duration</th><th>Status</th><th /></tr></thead><tbody>
        {visible.map(item => <tr key={item.id}>
          <td><strong>{item.service_code}</strong></td><td><strong>{item.name}</strong><span className="table-sub">{item.description || "No description"}</span></td>
          <td>{item.category}</td><td>{item.unit_price}</td><td>{item.duration_minutes} min</td>
          <td><Badge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</Badge></td>
          <td><button className="text-button" onClick={() => setEditing(item)}>Edit</button></td>
        </tr>)}
      </tbody></table></div> : <EmptyState title="Catalog is empty" description={query ? "Try another search." : "Create a reusable service item for future agreements."} />}
    </Card>
    {createOpen && <CatalogModal onClose={() => setCreateOpen(false)} onSaved={item => { setItems(current => [item, ...current.filter(existing => existing.id !== item.id)]); setCreateOpen(false); }} />}
    {editing && <CatalogModal item={editing} onClose={() => setEditing(null)} onSaved={item => { setItems(current => current.map(existing => existing.id === item.id ? item : existing)); setEditing(null); }} />}
  </div>;
}

function CatalogModal({ item, onClose, onSaved }: { item?: ServiceCatalogItem; onClose: () => void; onSaved: (item: ServiceCatalogItem) => void }) {
  const [form, setForm] = useState({
    code: item?.service_code || "",
    name: item?.name || "",
    category: item?.category || "",
    description: item?.description || "",
    price: item?.unit_price || "0",
    duration: String(item?.duration_minutes ?? 0),
    isActive: item?.is_active ?? true,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = item
        ? await endpoints.catalog.update(item.id, { name: form.name, category: form.category, description: form.description || null, unit_price: form.price, duration_minutes: Number(form.duration), is_active: form.isActive }) as ServiceCatalogItem
        : await endpoints.catalog.create({ service_code: form.code, name: form.name, category: form.category, description: form.description || null, unit_price: form.price, duration_minutes: Number(form.duration) }) as ServiceCatalogItem;
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to ${item ? "save" : "create"} service`);
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={item ? `Edit service · ${item.service_code}` : "Add service"} onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <div className="form-two">
        <label>Service code<Input value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} disabled={Boolean(item)} minLength={2} required /></label>
        <label>Category<Input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} minLength={2} required /></label>
      </div>
      <label>Name<Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} minLength={2} required /></label>
      <label>Description<TextArea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <div className="form-two">
        <label>Unit price<Input type="number" step="0.01" min="0" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} required /></label>
        <label>Duration, minutes<Input type="number" min="0" max="100000" value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })} required /></label>
      </div>
      {item && <label className="checkbox-label"><input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} /> Active service (inactive items stay in past records)</label>}
      {error && <div className="error-banner" role="alert">{error}</div>}
      <Button disabled={busy}>{busy ? "Saving…" : item ? "Save service" : "Create service"}</Button>
    </form>
  </Modal>;
}

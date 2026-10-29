import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import type { Agreement, Contact, Customer, RenewalOffer, ServiceLocation } from "../types";
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, TextArea } from "../components/ui";

const money = (value: string, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));
const tone = (status: Agreement["status"]) => status === "active" ? "success" : status === "suspended" || status === "proposed" ? "warning" : status === "cancelled" || status === "expired" || status === "rejected" ? "danger" : "info";

export function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const [agreementData, customerData] = await Promise.all([endpoints.agreements.list("limit=100"), endpoints.customers.list("status=active&limit=100")]);
      setAgreements(agreementData); setCustomers(customerData);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load agreements"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function afterAction(updated: Agreement) { setAgreements(current => current.map(item => item.id === updated.id ? updated : item)); setSelected(updated); }

  return <div>
    <PageHeader eyebrow="Contracts" title="Agreements" description="Build, propose, accept and manage service agreements while preserving immutable pricing history." actions={<Button onClick={() => setCreateOpen(true)}>New agreement</Button>} />
    {error && <div className="error-banner page-error">{error}</div>}
    <Card>
      {loading ? <div className="center-load"><Spinner /></div> : agreements.length ? <div className="table-wrap"><table><thead><tr><th>Agreement</th><th>Customer</th><th>Term</th><th>Total</th><th>Status</th><th /></tr></thead><tbody>
        {agreements.map(item => <tr key={item.id}><td><button className="table-link" onClick={() => setSelected(item)}><strong>{item.agreement_number}</strong><span>{item.title}</span></button></td><td>{customers.find(customer => customer.id === item.customer_id)?.name || "Customer"}</td><td>{item.start_date} → {item.end_date}</td><td>{money(item.total_amount, item.currency)}</td><td><Badge tone={tone(item.status)}>{item.status}</Badge></td><td><button className="text-button" onClick={() => setSelected(item)}>Open</button></td></tr>)}
      </tbody></table></div> : <EmptyState title="No agreements yet" description="Create the first contract from a customer and service location." />}
    </Card>
    {createOpen && <AgreementCreateModal customers={customers} onClose={() => setCreateOpen(false)} onCreated={agreement => { setAgreements(current => [agreement, ...current]); setCreateOpen(false); setSelected(agreement); }} />}
    {selected && <AgreementDetail agreement={selected} customer={customers.find(item => item.id === selected.customer_id)} onClose={() => setSelected(null)} onUpdated={afterAction} />}
  </div>;
}

function AgreementCreateModal({ customers, onClose, onCreated }: { customers: Customer[]; onClose: () => void; onCreated: (agreement: Agreement) => void }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [form, setForm] = useState({ serviceLocationId: "", title: "", startDate: new Date().toISOString().slice(0,10), endDate: new Date(Date.now() + 31536000000).toISOString().slice(0,10), billingFrequency: "annual", autoRenew: false, renewalNoticeDays: "30", termsText: "", name: "", code: "SERVICE", quantity: "1", unitPrice: "0" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (!customerId) { setLocations([]); return; } endpoints.customers.locations(customerId).then(items => { setLocations(items); setForm(current => ({ ...current, serviceLocationId: items[0]?.id || "" })); }).catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load locations")); }, [customerId]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const agreement = await endpoints.agreements.create({ customer_id: customerId, service_location_id: form.serviceLocationId, title: form.title, start_date: form.startDate, end_date: form.endDate, billing_frequency: form.billingFrequency, auto_renew: form.autoRenew, renewal_notice_days: Number(form.renewalNoticeDays), terms_text: form.termsText, lines: [{ name: form.name, service_code: form.code, quantity: form.quantity, unit_price: form.unitPrice }] });
      onCreated(agreement);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create agreement"); }
    finally { setBusy(false); }
  }
  return <Modal title="New service agreement" onClose={onClose}><form className="form-grid" onSubmit={submit}>
    <div className="form-two"><label>Customer<Select value={customerId} onChange={event => setCustomerId(event.target.value)}>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></label><label>Service location<Select value={form.serviceLocationId} onChange={event => setForm({ ...form, serviceLocationId: event.target.value })} disabled={!locations.length}>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></label></div>
    <label>Agreement title<Input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required /></label>
    <div className="form-two"><label>Start date<Input type="date" value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} required /></label><label>End date<Input type="date" value={form.endDate} onChange={event => setForm({ ...form, endDate: event.target.value })} required /></label></div>
    <div className="form-three"><label>Billing<Select value={form.billingFrequency} onChange={event => setForm({ ...form, billingFrequency: event.target.value })}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semi_annual">Semi-annual</option><option value="annual">Annual</option><option value="one_time">One-time</option></Select></label><label>Renewal notice days<Input type="number" min="0" max="365" value={form.renewalNoticeDays} onChange={event => setForm({ ...form, renewalNoticeDays: event.target.value })} /></label><label className="checkbox-label"><input type="checkbox" checked={form.autoRenew} onChange={event => setForm({ ...form, autoRenew: event.target.checked })} /> Auto-renew</label></div>
    <div className="section-divider"><span>First service line</span></div><div className="form-three"><label>Code<Input value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} required /></label><label>Service name<Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></label><label>Unit price<Input type="number" step="0.01" min="0" value={form.unitPrice} onChange={event => setForm({ ...form, unitPrice: event.target.value })} required /></label></div>
    <label>Terms<TextArea value={form.termsText} onChange={event => setForm({ ...form, termsText: event.target.value })} /></label>
    {error && <div className="error-banner">{error}</div>}<Button disabled={busy || !form.serviceLocationId}>{busy ? "Creating…" : "Create draft agreement"}</Button>
  </form></Modal>;
}

function AgreementDetail({ agreement, customer, onClose, onUpdated }: { agreement: Agreement; customer?: Customer; onClose: () => void; onUpdated: (agreement: Agreement) => void }) {
  const [versions, setVersions] = useState<unknown[]>([]); const [events, setEvents] = useState<unknown[]>([]); const [renewals, setRenewals] = useState<RenewalOffer[]>([]);
  const [tab, setTab] = useState<"summary" | "history" | "renewals">("summary"); const [actionOpen, setActionOpen] = useState<"accept" | "suspend" | "cancel" | null>(null); const [renewalOpen, setRenewalOpen] = useState(false); const [sendOpen, setSendOpen] = useState(false); const [error, setError] = useState("");
  useEffect(() => { Promise.all([endpoints.agreements.versions(agreement.id), endpoints.agreements.events(agreement.id), endpoints.agreements.renewals(agreement.id)]).then(([versionData, eventData, renewalData]) => { setVersions(versionData); setEvents(eventData); setRenewals(renewalData); }).catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load agreement history")); }, [agreement.id]);
  async function run(action: string, body?: unknown) {
    setError("");
    try { const updated = await endpoints.agreements.action(agreement.id, action, body); onUpdated(updated); setActionOpen(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Agreement action failed"); }
  }
  return <Modal title={agreement.agreement_number} onClose={onClose}>
    <div className="drawer-meta"><div><strong>{agreement.title}</strong><span className="muted">{agreement.version_number} saved version{agreement.version_number === 1 ? "" : "s"}</span></div><Badge tone={tone(agreement.status)}>{agreement.status}</Badge></div>
    {error && <div className="error-banner">{error}</div>}
    <div className="tabs"><button className={tab==="summary"?"tab active":"tab"} onClick={()=>setTab("summary")}>Summary</button><button className={tab==="history"?"tab active":"tab"} onClick={()=>setTab("history")}>History</button><button className={tab==="renewals"?"tab active":"tab"} onClick={()=>setTab("renewals")}>Renewals ({renewals.length})</button></div>
    {tab==="summary"&&<div><div className="detail-grid"><div><span className="eyebrow">Term</span><strong>{agreement.start_date} → {agreement.end_date}</strong></div><div><span className="eyebrow">Value</span><strong>{money(agreement.total_amount,agreement.currency)}</strong></div><div><span className="eyebrow">Billing</span><strong className="capitalize">{agreement.billing_frequency.replace("_"," ")}</strong></div><div><span className="eyebrow">Auto renew</span><strong>{agreement.auto_renew?"Yes":"No"}</strong></div><div className="detail-wide"><span className="eyebrow">Terms</span><p className="muted">{agreement.terms_text||"No contract terms entered."}</p></div></div><div className="line-items"><strong>Pricing snapshot</strong>{agreement.lines.map(line=><div className="list-row" key={line.id}><div><strong>{line.name}</strong><span>{line.service_code} · {line.quantity} × {line.unit_price}</span></div><strong>{money(line.line_total,agreement.currency)}</strong></div>)}</div></div>}
    {tab==="history"&&<div className="history-grid"><div><span className="eyebrow">Events</span>{events.length?<div className="timeline">{events.map((item,index)=><div key={index} className="timeline-item"><strong>{String((item as {event_type?:unknown}).event_type||"event")}</strong><span>{String((item as {created_at?:unknown}).created_at||"")}</span></div>)}</div>:<EmptyState title="No events" description="Agreement lifecycle events will appear here."/>}</div><div><span className="eyebrow">Saved versions</span>{versions.length?<div className="timeline">{versions.map((item,index)=><div key={index} className="timeline-item"><strong>Version {String((item as {version_number?:unknown}).version_number||"")}</strong><span>{String((item as {change_reason?:unknown}).change_reason||"")}</span></div>)}</div>:<EmptyState title="No versions" description="Version snapshots appear when the agreement is proposed or changed."/>}</div></div>}
    {tab==="renewals"&&<div><div className="card-title-row"><div><span className="eyebrow">Renewal offers</span><h3>Offers for this agreement</h3></div>{agreement.status==="active"&&<Button onClick={()=>setRenewalOpen(true)}>Create offer</Button>}</div>{renewals.length?<div className="list">{renewals.map(item=><div className="list-row" key={item.id}><div><strong>{item.proposed_start_date} → {item.proposed_end_date}</strong><span>Expires {item.expires_on}</span></div><Badge tone={item.status==="accepted"?"success":item.status==="declined"||item.status==="cancelled"?"danger":"warning"}>{item.status}</Badge></div>)}</div>:<EmptyState title="No renewal offers" description="Create a renewal offer from an active agreement."/>}</div>}
    <div className="modal-actions">
      {agreement.status==="draft"&&<Button onClick={()=>void run("propose")}>Propose</Button>}
      {agreement.status==="proposed"&&<><Button onClick={()=>setSendOpen(true)}>Send for electronic acceptance</Button><Button className="btn-secondary" onClick={()=>setActionOpen("accept")}>Record manual acceptance</Button></>}
      {agreement.status==="accepted"&&<Button onClick={()=>void run("activate")}>Activate</Button>}
      {agreement.status==="active"&&<><Button className="btn-secondary" onClick={()=>setActionOpen("suspend")}>Suspend</Button><Button className="btn-danger" onClick={()=>setActionOpen("cancel")}>Cancel</Button></>}
      {agreement.status==="suspended"&&<><Button onClick={()=>void run("resume")}>Resume</Button><Button className="btn-danger" onClick={()=>setActionOpen("cancel")}>Cancel</Button></>}
      {["draft","proposed","accepted"].includes(agreement.status)&&<Button className="btn-danger" onClick={()=>setActionOpen("cancel")}>Cancel</Button>}
    </div>
    {actionOpen==="accept"&&<AcceptanceModal onClose={()=>setActionOpen(null)} onSubmit={body=>void run("accept",body)} />}{(actionOpen==="suspend"||actionOpen==="cancel")&&<ReasonModal onClose={()=>setActionOpen(null)} onSubmit={reason=>{void run(actionOpen,{reason})}} />}{renewalOpen&&<RenewalModal agreement={agreement} onClose={()=>setRenewalOpen(false)} onCreated={offer=>{setRenewals(current=>[offer,...current]);setRenewalOpen(false);}}/>}{sendOpen&&<AgreementSendModal agreement={agreement} customer={customer} onClose={()=>setSendOpen(false)} />
}
  </Modal>;
}

function AcceptanceModal({onClose,onSubmit}:{onClose:()=>void;onSubmit:(body:unknown)=>void}){const[form,setForm]=useState({name:"",reference:""});return <Modal title="Record manual acceptance" onClose={onClose}><form className="form-grid" onSubmit={e=>{e.preventDefault();onSubmit({accepted_by_name:form.name,method:"manual",reference:form.reference||null})}}><label>Accepted by<Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Reference<Input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></label><p className="muted">Use this only when the customer accepted outside the electronic agreement page.</p><Button>Save manual acceptance</Button></form></Modal>}

function AgreementSendModal({agreement,customer,onClose}:{agreement:Agreement;customer?:Customer;onClose:()=>void}){const[contacts,setContacts]=useState<Contact[]>([]);const[recipient,setRecipient]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[result,setResult]=useState<{recipient_name:string;recipient_email:string;notification_status:string;expires_at:string}|null>(null);useEffect(()=>{if(!customer)return;endpoints.customers.contacts(customer.id).then(items=>{setContacts(items);setRecipient(customer.email?"customer":items.find(item=>item.email)?.id||"");}).catch(cause=>setError(cause instanceof Error?cause.message:"Unable to load customer contacts"));},[customer]);const contact=contacts.find(item=>item.id===recipient);const email=recipient==="customer"?customer?.email:contact?.email;async function submit(event:FormEvent){event.preventDefault();if(!email){setError("Select a customer contact with an email address or add an email to the customer record.");return;}setBusy(true);setError("");try{setResult(await endpoints.agreementPortal.send(agreement.id,{contact_id:recipient==="customer"||!recipient?null:recipient}));}catch(cause){setError(cause instanceof Error?cause.message:"Unable to queue the agreement email");}finally{setBusy(false);}}if(result)return <Modal title="Agreement email queued" onClose={onClose}><div className="success-banner">The electronic agreement link was queued for {result.recipient_name} at {result.recipient_email}. Delivery status: {result.notification_status}. The secure link expires {new Date(result.expires_at).toLocaleString()}.</div><div className="modal-actions"><Button onClick={onClose}>Done</Button></div></Modal>;return <Modal title="Send agreement for electronic acceptance" onClose={onClose}><form className="form-grid" onSubmit={submit}>{customer?.email||contacts.some(item=>item.email)?<label>Send to<Select value={recipient} onChange={event=>setRecipient(event.target.value)}>{customer?.email&&<option value="customer">{customer.name} — {customer.email}</option>}{contacts.filter(item=>item.email).map(item=><option key={item.id} value={item.id}>{item.full_name} — {item.email}{item.is_billing_contact?" · Billing contact":""}</option>)}</Select></label>:<div className="error-banner">No customer or contact email address is available. Add one before sending.</div>}<p className="muted">The email contains a secure link to the exact proposed agreement version. The customer can review it and accept or reject it without creating an account.</p>{error&&<div className="error-banner">{error}</div>}<Button disabled={busy||!email}>{busy?"Queueing…":"Send agreement email"}</Button></form></Modal>}
function ReasonModal({onClose,onSubmit}:{onClose:()=>void;onSubmit:(reason:string)=>void}){const[reason,setReason]=useState("");return <Modal title="Add a reason" onClose={onClose}><form className="form-grid" onSubmit={e=>{e.preventDefault();onSubmit(reason)}}><label>Reason<TextArea value={reason} onChange={e=>setReason(e.target.value)} minLength={3} required/></label><Button>Continue</Button></form></Modal>}
function RenewalModal({agreement,onClose,onCreated}:{agreement:Agreement;onClose:()=>void;onCreated:(offer:RenewalOffer)=>void}){const[start,setStart]=useState(agreement.end_date);const[end,setEnd]=useState(new Date(new Date(agreement.end_date).getTime()+365*86400000).toISOString().slice(0,10));const[expires,setExpires]=useState(new Date(new Date(agreement.end_date).getTime()-86400000).toISOString().slice(0,10));const[title,setTitle]=useState(agreement.title);const[error,setError]=useState("");const[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{onCreated(await endpoints.agreements.createRenewal(agreement.id,{proposed_start_date:start,proposed_end_date:end,expires_on:expires,title}))}catch(c){setError(c instanceof Error?c.message:"Unable to create renewal offer")}finally{setBusy(false)}}return <Modal title="Create renewal offer" onClose={onClose}><form className="form-grid" onSubmit={submit}><label>Offer title<Input value={title} onChange={e=>setTitle(e.target.value)}/></label><div className="form-three"><label>Proposed start<Input type="date" value={start} onChange={e=>setStart(e.target.value)} required/></label><label>Proposed end<Input type="date" value={end} onChange={e=>setEnd(e.target.value)} required/></label><label>Offer expires<Input type="date" value={expires} onChange={e=>setExpires(e.target.value)} required/></label></div>{error&&<div className="error-banner">{error}</div>}<Button disabled={busy}>{busy?"Saving…":"Create offer"}</Button></form></Modal>}
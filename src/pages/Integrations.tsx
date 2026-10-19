import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { endpoints } from "../lib/api";
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Spinner, TextArea } from "../components/ui";

type DeliveryItem = { id:string; recipient_email?:string; recipient_phone?:string; subject?:string; body?:string; payload?:Record<string,unknown>; event_type:string; status:string; attempt_count:number; created_at:string; sent_at?:string|null; name?:string; url?:string; subscribed_events?:string[]; is_active?:boolean; endpoint_id?:string; http_status?:number|null; max_attempts?:number; response_body?:string|null; last_error?:string|null; delivered_at?:string|null; next_attempt_at?:string; };
type NotificationDetail = { id:string; event_type:string; channel:string; recipient_email:string; subject:string; body:string; payload:Record<string,unknown>; status:string; scheduled_at:string; next_attempt_at:string; attempt_count:number; max_attempts:number; last_error:string|null; provider_message_id:string|null; sent_at:string|null; created_at:string; updated_at:string };
type NotificationAttempt = { id:string; notification_id:string; attempt_number:number; status:string; provider:string; provider_message_id:string|null; error_message:string|null; started_at:string; finished_at:string|null };
type WebhookAttempt = { id:string; attempt_number:number; status:string; http_status:number|null; response_body:string|null; error_message:string|null; started_at:string; finished_at:string|null };
type WebhookCreated = { secret:string };

const events=["customer.created","customer.updated","agreement.created","agreement.status_changed","work_order.created","work_order.status_changed","invoice.issued","invoice.status_changed","payment.received","maintenance.work_order_generated"];
function idempotency(prefix:string){return prefix+"-"+crypto.randomUUID()}

export function IntegrationsPage(){const[tab,setTab]=useState<"email"|"webhooks"|"sms">("email");return <div><PageHeader eyebrow="Integrations" title="Delivery & integrations" description="Operate durable email/SMS outboxes and signed webhook endpoints with retry visibility."/><div className="module-tabs"><button className={tab==="email"?"module-tab active":"module-tab"} onClick={()=>setTab("email")}>Email</button><button className={tab==="webhooks"?"module-tab active":"module-tab"} onClick={()=>setTab("webhooks")}>Webhooks</button><button className={tab==="sms"?"module-tab active":"module-tab"} onClick={()=>setTab("sms")}>SMS</button></div>{tab==="email"?<EmailPanel/>:tab==="webhooks"?<WebhookPanel/>:<SmsPanel/>}</div>}

function EmailPanel() {
  const [items,setItems] = useState<DeliveryItem[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [compose,setCompose] = useState(false);
  const [selected,setSelected] = useState<DeliveryItem|null>(null);

  async function load() {
    setError("");
    try { setItems(await endpoints.notifications.list("limit=100") as DeliveryItem[]); }
    catch(cause) { setError(cause instanceof Error ? cause.message : "Unable to load notifications"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function retry(id:string) {
    setError("");
    try { await endpoints.notifications.retry(id); await load(); }
    catch(cause) { setError(cause instanceof Error ? cause.message : "Unable to retry email"); }
  }

  return <div>
    <div className="page-actions settings-action"><Button onClick={() => setCompose(true)}>Queue email</Button></div>
    {error && <div className="error-banner page-error" role="alert">{error}</div>}
    <Card>{loading ? <div className="center-load"><Spinner/></div> : items.length ? <div className="table-wrap"><table>
      <thead><tr><th>Recipient</th><th>Subject</th><th>Event</th><th>Status</th><th>Attempts</th><th /></tr></thead>
      <tbody>{items.map(item=><tr key={item.id}>
        <td>{item.recipient_email}</td><td><strong>{item.subject}</strong></td><td>{item.event_type}</td>
        <td><Badge tone={item.status==="sent"?"success":item.status==="dead"?"danger":"warning"}>{item.status}</Badge></td>
        <td>{item.attempt_count}/{item.max_attempts??"—"}</td>
        <td><div className="row-actions"><button className="text-button" onClick={() => setSelected(item)}>Details & attempts</button>{item.status==="dead"&&<button className="text-button" onClick={() => void retry(item.id)}>Retry</button>}</div></td>
      </tr>)}</tbody>
    </table></div> : <EmptyState title="No email deliveries" description="Queued notification messages will appear here."/>}</Card>
    {compose&&<EmailModal onClose={() => setCompose(false)} onCreated={() => { setCompose(false); void load(); }}/>}
    {selected&&<NotificationDetailModal notification={selected} onClose={() => setSelected(null)}/>}
  </div>;
}

function EmailModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}){const[form,setForm]=useState({email:"",subject:"",body:"",eventType:"manual.notification"}),[error,setError]=useState(""),[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{await endpoints.notifications.create({event_type:form.eventType,recipient_email:form.email,subject:form.subject,body:form.body,payload:{}},idempotency("email"));onCreated()}catch(c){setError(c instanceof Error?c.message:"Unable to queue email")}finally{setBusy(false)}}return <Modal title="Queue email" onClose={onClose}><form className="form-grid" onSubmit={submit}><label>Recipient<Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></label><label>Subject<Input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} required/></label><label>Event type<Input value={form.eventType} onChange={e=>setForm({...form,eventType:e.target.value})} required/></label><label>Body<TextArea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} required/></label>{error&&<div className="error-banner">{error}</div>}<Button disabled={busy}>{busy?"Queueing…":"Queue email"}</Button></form></Modal>}

function NotificationDetailModal({notification,onClose}:{notification:DeliveryItem;onClose:()=>void}) {
 const [detail,setDetail] = useState<NotificationDetail|null>(null);
 const [attempts,setAttempts] = useState<NotificationAttempt[]>([]);
 const [loading,setLoading] = useState(true);
 const [error,setError] = useState("");
 useEffect(() => {
   let live = true;
   Promise.all([endpoints.notifications.get(notification.id),endpoints.notifications.attempts(notification.id)])
     .then(([record,history]) => { if(live){setDetail(record as NotificationDetail);setAttempts(history as NotificationAttempt[]);} })
     .catch(cause => { if(live)setError(cause instanceof Error?cause.message:"Unable to load email delivery details"); })
     .finally(() => { if(live)setLoading(false); });
   return () => { live = false; };
 },[notification.id]);

 return <Modal title="Email delivery details" onClose={onClose}>
   {error&&<div className="error-banner" role="alert">{error}</div>}
   {loading?<div className="center-load"><Spinner/></div>:detail&&<>
     <div className="notification-detail-heading">
       <div><span className="eyebrow">{detail.event_type}</span><h3>{detail.subject}</h3><p className="muted">To {detail.recipient_email}</p></div>
       <Badge tone={detail.status==="sent"?"success":detail.status==="dead"?"danger":"warning"}>{detail.status}</Badge>
     </div>
     <div className="detail-grid">
       <div><span className="eyebrow">Attempts</span><strong>{detail.attempt_count} / {detail.max_attempts}</strong></div>
       <div><span className="eyebrow">Queued</span><strong>{new Date(detail.created_at).toLocaleString()}</strong></div>
       <div><span className="eyebrow">Next attempt</span><strong>{detail.status==="sent"||detail.status==="dead"?"—":new Date(detail.next_attempt_at).toLocaleString()}</strong></div>
       <div><span className="eyebrow">Sent at</span><strong>{detail.sent_at?new Date(detail.sent_at).toLocaleString():"Not sent"}</strong></div>
       {detail.last_error&&<div className="detail-wide"><span className="eyebrow">Last error</span><p className="error-text">{detail.last_error}</p></div>}
       <div className="detail-wide"><span className="eyebrow">Message body</span><div className="notification-message">{detail.body}</div></div>
     </div>
     <div className="section-divider"><span>Delivery attempts</span></div>
     {attempts.length?<div className="table-wrap"><table><thead><tr><th>#</th><th>Status</th><th>Provider</th><th>Started</th><th>Result</th></tr></thead><tbody>
       {attempts.map(attempt=><tr key={attempt.id}><td>{attempt.attempt_number}</td><td><Badge tone={attempt.status==="sent"?"success":attempt.status==="failed"?"danger":"warning"}>{attempt.status}</Badge></td><td>{attempt.provider}</td><td>{new Date(attempt.started_at).toLocaleString()}</td><td>{attempt.error_message||attempt.provider_message_id||"—"}</td></tr>)}
     </tbody></table></div>:<EmptyState title="No delivery attempts" description="An attempt record will appear when delivery is processed."/>}
   </>}
 </Modal>;
}

function SmsPanel(){const[items,setItems]=useState<DeliveryItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[compose,setCompose]=useState(false);async function load(){try{setItems(await endpoints.sms.list() as DeliveryItem[])}catch(c){setError(c instanceof Error?c.message:"Unable to load SMS")}finally{setLoading(false)}}useEffect(()=>{void load()},[]);return <div><div className="page-actions settings-action"><Button onClick={()=>setCompose(true)}>Queue SMS</Button></div>{error&&<div className="error-banner page-error">{error}</div>}<Card>{loading?<div className="center-load"><Spinner/></div>:items.length?<div className="table-wrap"><table><thead><tr><th>Phone</th><th>Event</th><th>Status</th><th>Attempts</th><th>Created</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.recipient_phone}</td><td>{item.event_type}</td><td><Badge tone={item.status==="sent"?"success":item.status==="dead"?"danger":"warning"}>{item.status}</Badge></td><td>{item.attempt_count}</td><td>{new Date(item.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>:<EmptyState title="No SMS messages" description="Queued SMS deliveries will appear here when an SMS provider is configured."/>}</Card>{compose&&<SmsModal onClose={()=>setCompose(false)} onCreated={()=>{setCompose(false);void load()}}/>}</div>}
function SmsModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}){const[form,setForm]=useState({phone:"",body:"",eventType:"manual.notification"}),[error,setError]=useState(""),[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{await endpoints.sms.create({event_type:form.eventType,recipient_phone:form.phone,body:form.body,payload:{}},idempotency("sms"));onCreated()}catch(c){setError(c instanceof Error?c.message:"Unable to queue SMS")}finally{setBusy(false)}}return <Modal title="Queue SMS" onClose={onClose}><form className="form-grid" onSubmit={submit}><label>Phone<Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required/></label><label>Event type<Input value={form.eventType} onChange={e=>setForm({...form,eventType:e.target.value})} required/></label><label>Message<TextArea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} maxLength={1600} required/></label>{error&&<div className="error-banner">{error}</div>}<Button disabled={busy}>{busy?"Queueing…":"Queue SMS"}</Button></form></Modal>}

function WebhookPanel() {
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<DeliveryItem | null>(null);
  const [secret, setSecret] = useState("");
  const [deliveryEndpoint, setDeliveryEndpoint] = useState<DeliveryItem | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);
  const [attempts, setAttempts] = useState<WebhookAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState("");
  const [attemptsOpen, setAttemptsOpen] = useState(false);

  async function load() {
    try {
      setItems(await endpoints.webhooks.list() as DeliveryItem[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load webhooks");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function rotate(id: string) {
    try {
      const result = await endpoints.webhooks.rotate(id) as WebhookCreated;
      setSecret(result.secret);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to rotate secret");
    }
  }

  async function disable(id: string) {
    try {
      await endpoints.webhooks.deactivate(id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to deactivate endpoint");
    }
  }

  async function showDeliveries(endpoint: DeliveryItem) {
    setDeliveryEndpoint(endpoint);
    setDeliveries([]);
    setDeliveryError("");
    setDeliveriesLoading(true);
    try {
      setDeliveries(await endpoints.webhooks.deliveries(endpoint.id) as DeliveryItem[]);
    } catch (cause) {
      setDeliveryError(cause instanceof Error ? cause.message : "Unable to load webhook deliveries");
    } finally {
      setDeliveriesLoading(false);
    }
  }

  async function retryDelivery(delivery: DeliveryItem) {
    setDeliveryError("");
    try {
      await endpoints.webhooks.retryDelivery(delivery.id);
      if (deliveryEndpoint) await showDeliveries(deliveryEndpoint);
    } catch (cause) {
      setDeliveryError(cause instanceof Error ? cause.message : "Unable to retry webhook delivery");
    }
  }

  async function showAttempts(delivery: DeliveryItem) {
    setSelectedDelivery(delivery);
    setAttemptsOpen(true);
    setAttempts([]);
    setAttemptsError("");
    setAttemptsLoading(true);
    try {
      setAttempts(await endpoints.webhooks.attempts(delivery.id) as WebhookAttempt[]);
    } catch (cause) {
      setAttemptsError(cause instanceof Error ? cause.message : "Unable to load delivery attempts");
    } finally {
      setAttemptsLoading(false);
    }
  }

  return <div>
    <div className="page-actions settings-action"><Button onClick={() => setOpen(true)}>Add webhook</Button></div>
    {secret && <Card className="secret-card"><strong>New webhook secret</strong><code>{secret}</code><span>Save this secret now. The backend only returns the plaintext secret on creation or rotation.</span><Button className="btn-secondary" onClick={() => setSecret("")}>Dismiss</Button></Card>}
    {error && <div className="error-banner page-error">{error}</div>}
    <Card>{loading ? <div className="center-load"><Spinner /></div> : items.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>URL</th><th>Events</th><th>Status</th><th /></tr></thead><tbody>
      {items.map(item => <tr key={item.id}>
        <td><strong>{item.name}</strong></td><td>{item.url}</td><td>{(item.subscribed_events ?? []).length}</td>
        <td><Badge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</Badge></td>
        <td><div className="row-actions"><button className="text-button" onClick={() => void showDeliveries(item)}>Deliveries</button><button className="text-button" onClick={() => setEditingEndpoint(item)}>Edit</button><button className="text-button" onClick={() => void rotate(item.id)}>Rotate secret</button>{item.is_active && <button className="text-button danger-text" onClick={() => void disable(item.id)}>Deactivate</button>}</div></td>
      </tr>)}
    </tbody></table></div> : <EmptyState title="No webhook endpoints" description="Connect your service systems with signed, retryable webhook delivery."/>}</Card>

    {(open || editingEndpoint) && <WebhookModal key={editingEndpoint?.id || "new-endpoint"} endpoint={editingEndpoint || undefined} onClose={() => { setOpen(false); setEditingEndpoint(null); }} onCreated={(result: WebhookCreated) => { setOpen(false); setSecret(result.secret); void load(); }} onUpdated={() => { setEditingEndpoint(null); void load(); }} />}

    {deliveryEndpoint && <Modal title={`Deliveries · ${deliveryEndpoint.name || "Webhook endpoint"}`} onClose={() => { setDeliveryEndpoint(null); setDeliveries([]); setDeliveryError(""); }}>
      <p className="muted">Recent delivery attempts for <strong>{deliveryEndpoint.url}</strong>.</p>
      {deliveryError && <div className="error-banner" role="alert">{deliveryError}</div>}
      {deliveriesLoading ? <div className="center-load"><Spinner /></div> : deliveries.length ? <div className="table-wrap"><table><thead><tr><th>Event</th><th>Status</th><th>HTTP</th><th>Attempts</th><th>Result</th><th /></tr></thead><tbody>
        {deliveries.map(delivery => <tr key={delivery.id}>
          <td><strong>{delivery.event_type}</strong><span className="table-sub">{new Date(delivery.created_at).toLocaleString()}</span></td>
          <td><Badge tone={delivery.status === "sent" ? "success" : delivery.status === "dead" ? "danger" : "warning"}>{delivery.status}</Badge></td>
          <td>{delivery.http_status ?? "—"}</td><td>{delivery.attempt_count}/{delivery.max_attempts ?? "—"}</td>
          <td>{(delivery.last_error || delivery.response_body || (delivery.delivered_at ? "Delivered" : "No response yet")).slice(0, 90)}</td>
          <td><div className="row-actions"><button className="text-button" onClick={() => void showAttempts(delivery)}>Attempts</button>{delivery.status === "dead" && <button className="text-button" onClick={() => void retryDelivery(delivery)}>Retry</button>}</div></td>
        </tr>)}
      </tbody></table></div> : !deliveryError && <EmptyState title="No deliveries yet" description="Events sent to this endpoint will appear here."/>}
    </Modal>}

    {attemptsOpen && selectedDelivery && <WebhookAttemptsModal delivery={selectedDelivery} attempts={attempts} loading={attemptsLoading} error={attemptsError} onClose={() => setAttemptsOpen(false)} />}
  </div>;
}

function WebhookAttemptsModal({ delivery, attempts, loading, error, onClose }: { delivery: DeliveryItem; attempts: WebhookAttempt[]; loading: boolean; error: string; onClose: () => void }) {
  return <Modal title="Webhook attempt history" onClose={onClose}>
    <p className="muted">Delivery <code>{delivery.id}</code> · {delivery.event_type}</p>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {loading ? <div className="center-load"><Spinner /></div> : attempts.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Status</th><th>HTTP</th><th>Started</th><th>Result</th></tr></thead><tbody>
      {attempts.map(attempt => <tr key={attempt.id}><td>{attempt.attempt_number}</td><td><Badge tone={attempt.status === "sent" ? "success" : attempt.status === "failed" ? "danger" : "warning"}>{attempt.status}</Badge></td><td>{attempt.http_status ?? "—"}</td><td>{new Date(attempt.started_at).toLocaleString()}</td><td>{(attempt.error_message || attempt.response_body || "—").slice(0, 120)}</td></tr>)}
    </tbody></table></div> : !error && <EmptyState title="No attempt records" description="This delivery has no recorded attempts yet."/>}
  </Modal>;
}

function WebhookModal({endpoint,onClose,onCreated,onUpdated}:{endpoint?:DeliveryItem;onClose:()=>void;onCreated:(result:WebhookCreated)=>void;onUpdated:()=>void}) {
 const[form,setForm]=useState({
   name:endpoint?.name||"",url:endpoint?.url||"",events:endpoint?.subscribed_events||["customer.created"],isActive:endpoint?.is_active??true,
 });
 const[error,setError]=useState("");
 const[busy,setBusy]=useState(false);
 async function submit(event:FormEvent){
   event.preventDefault();setBusy(true);setError("");
   try{
     if(endpoint){
       await endpoints.webhooks.update(endpoint.id,{name:form.name,url:form.url,events:form.events,is_active:form.isActive});
       onUpdated();
     }else{
       const result=await endpoints.webhooks.create({name:form.name,url:form.url,events:form.events,is_active:form.isActive}) as WebhookCreated;
       onCreated(result);
     }
   }catch(cause){setError(cause instanceof Error?cause.message:"Unable to save webhook endpoint")}
   finally{setBusy(false)}
 }
 return <Modal title={endpoint?"Edit webhook endpoint":"Add webhook"} onClose={onClose}><form className="form-grid" onSubmit={submit}>
   <label>Name<Input value={form.name} onChange={event=>setForm({...form,name:event.target.value})} minLength={2} required/></label>
   <label>HTTPS endpoint URL<Input type="url" value={form.url} onChange={event=>setForm({...form,url:event.target.value})} placeholder="https://example.com/hooks" required/></label>
   <div><span className="eyebrow">Subscribed events</span><div className="event-grid">{events.map(event=><label className="check-item" key={event}><input type="checkbox" checked={form.events.includes(event)} onChange={change=>setForm({...form,events:change.target.checked?[...form.events,event]:form.events.filter(item=>item!==event)})}/>{event}</label>)}</div></div>
   {endpoint&&<label className="check-item"><input type="checkbox" checked={form.isActive} onChange={event=>setForm({...form,isActive:event.target.checked})}/> Endpoint is active</label>}
   {error&&<div className="error-banner" role="alert">{error}</div>}
   <Button disabled={busy||form.events.length===0}>{busy?"Saving…":endpoint?"Save endpoint":"Create endpoint"}</Button>
 </form></Modal>;
}

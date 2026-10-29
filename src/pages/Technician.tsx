import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Spinner, TextArea } from "../components/ui";
import { endpoints } from "../lib/api";
import type { WorkOrder } from "../types";

type ScheduleChecklist = { checklist_template?: string[] };

const statusTone = (status: WorkOrder["status"]) =>
  status === "completed" ? "success" : status === "cancelled" ? "danger" : status === "in_progress" ? "info" : "warning";

function dateLabel(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

export function TechnicianPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [completing, setCompleting] = useState<WorkOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function loadOrders() {
    setError("");
    try {
      const data = await endpoints.workOrders.list("limit=100");
      setOrders(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your assigned work orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOrders(); }, []);

  async function startOrder(order: WorkOrder) {
    setBusyId(order.id);
    setActionError("");
    try {
      const updated = await endpoints.workOrders.action(order.id, "start");
      setOrders(current => current.map(item => item.id === (updated as WorkOrder).id ? updated as WorkOrder : item));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to start this work order.");
    } finally {
      setBusyId(null);
    }
  }

  function replaceOrder(updated: WorkOrder) {
    setOrders(current => current.map(item => item.id === updated.id ? updated : item));
    setCompleting(null);
  }

  const visibleOrders = orders
    .filter(order => filter === "all" || !["completed", "cancelled"].includes(order.status))
    .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));

  return (
    <div className="technician-page">
      <PageHeader
        eyebrow="Field service"
        title="My Work"
        description="Your assigned work orders, service checklists, and completion records."
        actions={<Button className="btn-secondary" onClick={() => void loadOrders()}>Refresh</Button>}
      />
      <div className="technician-toolbar">
        <div><strong>{orders.filter(order => !["completed", "cancelled"].includes(order.status)).length}</strong><span> open assignments</span></div>
        <div className="technician-filter" role="group" aria-label="Work order filter">
          <button type="button" className={filter === "open" ? "module-tab active" : "module-tab"} onClick={() => setFilter("open")}>Open work</button>
          <button type="button" className={filter === "all" ? "module-tab active" : "module-tab"} onClick={() => setFilter("all")}>All assignments</button>
        </div>
      </div>
      {error && <div className="error-banner page-error" role="alert">{error}</div>}
      {actionError && <div className="error-banner page-error" role="alert">{actionError}</div>}
      {loading ? (
        <Card><div className="center-load"><Spinner /></div></Card>
      ) : visibleOrders.length ? (
        <div className="technician-order-grid">
          {visibleOrders.map(order => (
            <Card key={order.id} className="technician-order-card">
              <div className="technician-order-heading">
                <div><span className="eyebrow">{order.work_order_number}</span><h2>{order.title}</h2></div>
                <Badge tone={statusTone(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
              </div>
              <div className="technician-customer-details">
                <div><span className="eyebrow">Customer</span><strong>{order.customer_name || "Customer details unavailable"}</strong>{order.customer_phone && <a href={"tel:" + order.customer_phone}>{order.customer_phone}</a>}</div>
                <div><span className="eyebrow">Service location</span><strong>{order.service_location_name || "Service location"}</strong>{order.service_location_address && <span>{order.service_location_address}</span>}</div>
                {order.access_instructions && <div className="technician-access"><span className="eyebrow">Access instructions</span><p>{order.access_instructions}</p></div>}
              </div>
              <div className="technician-order-meta">
                <div><span className="eyebrow">Scheduled</span><strong>{dateLabel(order.scheduled_for)}</strong></div>
                <div><span className="eyebrow">Priority</span><strong className="capitalize">{order.priority}</strong></div>
                {order.appointment_start && <div><span className="eyebrow">Appointment</span><strong>{new Date(order.appointment_start).toLocaleString()}</strong></div>}
              </div>
              {order.description && <p className="technician-order-description">{order.description}</p>}
              {order.status === "completed" && (
                <div className="technician-completed-note"><strong>Work completed</strong><span>{order.completed_at ? new Date(order.completed_at).toLocaleString() : "Completion recorded"}</span></div>
              )}
              <div className="technician-order-actions">
                {order.status === "assigned" && (
                  <Button disabled={busyId === order.id} onClick={() => void startOrder(order)}>
                    {busyId === order.id ? "Starting…" : "Start work"}
                  </Button>
                )}
                {order.status === "in_progress" && (
                  <Button onClick={() => { setActionError(""); setCompleting(order); }}>Complete work</Button>
                )}
                {!["assigned", "in_progress"].includes(order.status) && (
                  <span className="muted">{order.status === "scheduled" ? "Waiting for dispatch" : "No further actions available"}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card><EmptyState title={filter === "all" ? "No assigned work orders" : "No open assignments"} description="When dispatch assigns you a work order, it will appear here." /></Card>
      )}
      {completing && (
        <CompleteWorkModal
          order={completing}
          onClose={() => setCompleting(null)}
          onCompleted={replaceOrder}
        />
      )}
    </div>
  );
}

function CompleteWorkModal({
  order,
  onClose,
  onCompleted,
}: {
  order: WorkOrder;
  onClose: () => void;
  onCompleted: (order: WorkOrder) => void;
}) {
  const [checklist, setChecklist] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [findings, setFindings] = useState("");
  const [signoff, setSignoff] = useState("");
  const [loadingChecklist, setLoadingChecklist] = useState(Boolean(order.maintenance_schedule_id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!order.maintenance_schedule_id) {
      setLoadingChecklist(false);
      return;
    }
    let live = true;
    endpoints.schedules.get(order.maintenance_schedule_id)
      .then(value => {
        if (!live) return;
        const schedule = value as ScheduleChecklist;
        const items = Array.isArray(schedule.checklist_template) ? schedule.checklist_template : [];
        setChecklist(items);
        setResults(Object.fromEntries(items.map(item => [item, false])));
      })
      .catch(cause => {
        if (live) setError(cause instanceof Error ? cause.message : "Unable to load the required service checklist.");
      })
      .finally(() => { if (live) setLoadingChecklist(false); });
    return () => { live = false; };
  }, [order.maintenance_schedule_id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingChecklist || saving) return;
    if (error) return;
    if (checklist.some(item => results[item] !== true)) {
      setError("Complete every checklist item before marking this work order complete.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await endpoints.workOrders.action(order.id, "complete", {
        completion_notes: notes.trim() || null,
        technician_findings: findings.trim() || null,
        checklist_results: results,
        customer_signoff_name: signoff.trim() || null,
      });
      onCompleted(updated as WorkOrder);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete this work order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={"Complete " + order.work_order_number} onClose={onClose}>
      <form className="technician-complete-form" onSubmit={event => void submit(event)}>
        <p className="muted">Record the work performed and finish the required checklist before submitting completion.</p>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {loadingChecklist ? <div className="center-load"><Spinner /></div> : checklist.length > 0 ? (
          <fieldset className="technician-checklist">
            <legend>Service checklist</legend>
            {checklist.map(item => (
              <label className="check-item" key={item}>
                <input
                  type="checkbox"
                  checked={results[item] === true}
                  onChange={event => setResults(current => ({ ...current, [item]: event.target.checked }))}
                />
                <span>{item}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="muted">No required checklist is attached to this work order.</p>
        )}
        <label>Completion notes <span className="muted">(optional)</span>
          <TextArea value={notes} onChange={event => setNotes(event.target.value)} maxLength={10000} placeholder="Summarize the work performed." />
        </label>
        <label>Technician findings <span className="muted">(optional)</span>
          <TextArea value={findings} onChange={event => setFindings(event.target.value)} maxLength={10000} placeholder="Record test results, issues, or follow-up needs." />
        </label>
        <label>Customer sign-off name <span className="muted">(optional)</span>
          <input className="input" value={signoff} onChange={event => setSignoff(event.target.value)} maxLength={160} placeholder="Name of the onsite contact" />
        </label>
        <div className="modal-actions">
          <Button disabled={saving || loadingChecklist}>{saving ? "Saving completion…" : "Submit completion"}</Button>
          <Button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

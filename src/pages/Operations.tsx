import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import type {
  Agreement,
  Branch,
  Customer,
  Equipment,
  ServiceLocation,
  TechnicianProfile,
  WorkOrder,
} from "../types";
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

type Schedule = {
  id: string;
  branch_id: string | null;
  customer_id: string;
  service_location_id: string;
  equipment_id: string | null;
  agreement_id: string | null;
  name: string;
  description: string | null;
  required_skill: string | null;
  frequency: string;
  next_due_date: string;
  checklist_template: string[];
  is_active: boolean;
};

const orderTone = (status: WorkOrder["status"]) =>
  status === "completed"
    ? "success"
    : status === "cancelled"
      ? "danger"
      : status === "in_progress"
        ? "info"
        : "warning";

const priorityTone = (priority: WorkOrder["priority"]) =>
  priority === "emergency"
    ? "danger"
    : priority === "high"
      ? "warning"
      : "neutral";

export function OperationsPage() {
  const [tab, setTab] = useState<"orders" | "schedules" | "branches">("orders");
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [create, setCreate] = useState(false);

  useEffect(() => {
    Promise.all([
      endpoints.workOrders.list("limit=100"),
      endpoints.schedules.list("limit=100"),
      endpoints.branches.list("limit=100"),
    ])
      .then(([o, s, b]) => {
        setOrders(o);
        setSchedules(s as Schedule[]);
        setBranches(b);
      })
      .catch((c) =>
        setError(c instanceof Error ? c.message : "Unable to load operations"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function action(order: WorkOrder, name: string, body?: unknown) {
    setError("");

    try {
      const updated = await endpoints.workOrders.action(order.id, name, body);
      setOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (c) {
      setError(c instanceof Error ? c.message : "Action failed");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Field service"
        title="Operations"
        description="Schedule recurring maintenance, dispatch work orders and keep branches aligned with local operating context."
        actions={
          <Button onClick={() => setCreate(true)}>
            {tab === "orders"
              ? "New work order"
              : tab === "schedules"
                ? "New maintenance plan"
                : "Add branch"}
          </Button>
        }
      />
      <div className="module-tabs">
        <button
          className={tab === "orders" ? "module-tab active" : "module-tab"}
          onClick={() => setTab("orders")}
        >
          Work orders
        </button>
        <button
          className={tab === "schedules" ? "module-tab active" : "module-tab"}
          onClick={() => setTab("schedules")}
        >
          Maintenance
        </button>
        <button
          className={tab === "branches" ? "module-tab active" : "module-tab"}
          onClick={() => setTab("branches")}
        >
          Branches
        </button>
      </div>
      {error && <div className="error-banner page-error">{error}</div>}
      {loading ? (
        <Card>
          <div className="center-load">
            <Spinner />
          </div>
        </Card>
      ) : tab === "orders" ? (
        <OrdersTable
          orders={orders}
          schedules={schedules}
          branches={branches}
          onAction={action}
          onUpdated={(updated) =>
            setOrders((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            )
          }
        />
      ) : tab === "schedules" ? (
        <SchedulesTable
          schedules={schedules}
          onGenerated={(order) => setOrders((current) => [order, ...current])}
          onUpdated={(updated) =>
            setSchedules((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            )
          }
        />
      ) : (
        <BranchesTable
          branches={branches}
          onUpdated={(updated) =>
            setBranches((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            )
          }
        />
      )}
      {create && tab === "orders" && (
        <WorkOrderModal
          branches={branches}
          onClose={() => setCreate(false)}
          onCreated={(order) => {
            setOrders((current) => [order, ...current]);
            setCreate(false);
          }}
        />
      )}
      {create && tab === "schedules" && (
        <ScheduleModal
          branches={branches}
          onClose={() => setCreate(false)}
          onCreated={(schedule) => {
            setSchedules((current) => [schedule, ...current]);
            setCreate(false);
          }}
        />
      )}
      {create && tab === "branches" && (
        <BranchModal
          onClose={() => setCreate(false)}
          onCreated={(branch) => {
            setBranches((current) => [branch, ...current]);
            setCreate(false);
          }}
        />
      )}
    </div>
  );
}

function OrdersTable({
  orders,
  schedules,
  branches,
  onAction,
  onUpdated,
}: {
  orders: WorkOrder[];
  schedules: Schedule[];
  branches: Branch[];
  onAction: (
    order: WorkOrder,
    action: string,
    body?: unknown,
  ) => Promise<void>;
  onUpdated: (order: WorkOrder) => void;
}) {
  const [assignOrder, setAssignOrder] = useState<WorkOrder | null>(null);
  const [completeOrder, setCompleteOrder] = useState<WorkOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<WorkOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<WorkOrder | null>(null);

  return (
    <Card>
      {orders.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Work order</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.work_order_number}</strong>
                    <span className="table-sub">{order.title}</span>
                  </td>
                  <td>{order.customer_id.slice(0, 8)}…</td>
                  <td>
                    {branches.find((branch) => branch.id === order.branch_id)
                      ?.name ??
                      (order.branch_id ? "Unavailable" : "Unassigned")}
                  </td>
                  <td>{order.scheduled_for}</td>
                  <td>
                    <Badge tone={priorityTone(order.priority)}>
                      {order.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={orderTone(order.status)}>
                      {order.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="text-button"
                        onClick={() => setDetailsOrder(order)}
                      >
                        Details
                      </button>
                      {(order.status === "scheduled" ||
                        order.status === "assigned") && (
                        <button
                          className="text-button"
                          onClick={() => setEditingOrder(order)}
                        >
                          Edit
                        </button>
                      )}
                      {(order.status === "scheduled" ||
                        order.status === "assigned") && (
                        <button
                          className="text-button"
                          onClick={() => setAssignOrder(order)}
                        >
                          Assign
                        </button>
                      )}
                      {order.status === "assigned" && (
                        <button
                          className="text-button"
                          onClick={() => void onAction(order, "start")}
                        >
                          Start
                        </button>
                      )}
                      {order.status === "in_progress" && (
                        <button
                          className="text-button"
                          onClick={() => setCompleteOrder(order)}
                        >
                          Complete
                        </button>
                      )}
                      {(order.status === "scheduled" ||
                        order.status === "assigned") && (
                        <button
                          className="text-button danger-text"
                          onClick={() => setCancelOrder(order)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No work orders"
          description="Create a scheduled job or generate one from a maintenance plan."
        />
      )}
      {assignOrder && (
        <AssignModal
          order={assignOrder}
          onClose={() => setAssignOrder(null)}
          onAssigned={(updated) => {
            onUpdated(updated);
            setAssignOrder(null);
          }}
        />
      )}
      {completeOrder && (
        <CompleteModal
          order={completeOrder}
          checklist={
            schedules.find(
              (item) => item.id === completeOrder.maintenance_schedule_id,
            )?.checklist_template ?? []
          }
          onClose={() => setCompleteOrder(null)}
          onComplete={(body) => {
            void onAction(completeOrder, "complete", body);
            setCompleteOrder(null);
          }}
        />
      )}
      {cancelOrder && (
        <ReasonAction
          title="Cancel work order"
          actionLabel="Cancel work order"
          onClose={() => setCancelOrder(null)}
          onSubmit={(reason) => {
            void onAction(cancelOrder, "cancel", { reason });
            setCancelOrder(null);
          }}
        />
      )}
      {editingOrder && (
        <WorkOrderEditModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditingOrder(null);
          }}
        />
      )}
      {detailsOrder && (
        <WorkOrderDetailsModal
          order={detailsOrder}
          onClose={() => setDetailsOrder(null)}
        />
      )}
    </Card>
  );
}

type WorkOrderEvent = {
  id: string;
  actor_user_id: string | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

function WorkOrderDetailsModal({
  order,
  onClose,
}: {
  order: WorkOrder;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<WorkOrder>(order);
  const [events, setEvents] = useState<WorkOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;

    Promise.all([
      endpoints.workOrders.get(order.id),
      endpoints.workOrders.events(order.id),
    ])
      .then(([detail, history]) => {
        if (live) {
          setCurrent(detail);
          setEvents(history as WorkOrderEvent[]);
        }
      })
      .catch((cause) => {
        if (live) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load work order details",
          );
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [order.id]);

  return (
    <Modal title={current.work_order_number} onClose={onClose}>
      <div className="drawer-meta">
        <div>
          <strong>{current.title}</strong>
          <span className="muted">Scheduled {current.scheduled_for}</span>
        </div>
        <Badge tone={orderTone(current.status)}>{current.status}</Badge>
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
      ) : (
        <>
          <div className="detail-grid">
            <div>
              <span className="eyebrow">Priority</span>
              <strong className="capitalize">{current.priority}</strong>
            </div>
            <div>
              <span className="eyebrow">Customer ID</span>
              <strong>{current.customer_id}</strong>
            </div>
            <div>
              <span className="eyebrow">Service location</span>
              <strong>{current.service_location_id}</strong>
            </div>
            <div>
              <span className="eyebrow">Assigned technician</span>
              <strong>{current.assigned_to_user_id || "Not assigned"}</strong>
              {current.required_skill && (
                <>
                  <span className="eyebrow">Required skill</span>
                  <strong>{current.required_skill}</strong>
                </>
              )}
            </div>
            <div className="detail-wide">
              <span className="eyebrow">Description</span>
              <p className="muted">
                {current.description || "No description entered."}
              </p>
            </div>
            {current.completion_notes && (
              <div className="detail-wide">
                <span className="eyebrow">Completion notes</span>
                <p className="muted">{current.completion_notes}</p>
              </div>
            )}
            {current.technician_findings && (
              <div className="detail-wide">
                <span className="eyebrow">Technician findings</span>
                <p className="muted">{current.technician_findings}</p>
              </div>
            )}
          </div>
          <div className="section-divider">
            <span>Activity history</span>
          </div>
          {events.length ? (
            <div className="timeline">
              {events.map((event) => (
                <div className="timeline-item" key={event.id}>
                  <strong>{event.event_type.replace(/_/g, " ")}</strong>
                  <span>
                    {event.from_status && event.to_status
                      ? event.from_status + " → " + event.to_status
                      : new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity yet"
              description="Changes to this work order will be recorded here."
            />
          )}
        </>
      )}
    </Modal>
  );
}

function WorkOrderEditModal({
  order,
  onClose,
  onSaved,
}: {
  order: WorkOrder;
  onClose: () => void;
  onSaved: (order: WorkOrder) => void;
}) {
  const [form, setForm] = useState({
    title: order.title,
    description: order.description || "",
    requiredSkill: order.required_skill || "",
    priority: order.priority,
    scheduledFor: order.scheduled_for,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const updated = await endpoints.workOrders.update(order.id, {
        title: form.title,
        description: form.description || null,
        required_skill: form.requiredSkill.trim() || null,
        priority: form.priority,
        scheduled_for: form.scheduledFor,
      });
      onSaved(updated);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update work order",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={"Edit " + order.work_order_number} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Title
          <Input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            minLength={2}
            required
          />
        </label>
        <label>
          Required skill (optional)
          <Input
            value={form.requiredSkill}
            onChange={(e) => setForm({ ...form, requiredSkill: e.target.value })}
            maxLength={80}
            placeholder="AC maintenance, refrigeration, HVAC…"
          />
          <span className="muted">If set, only a technician with this skill can be assigned.</span>
        </label>
        <div className="form-two">
          <label>
            Scheduled date
            <Input
              type="date"
              value={form.scheduledFor}
              onChange={(event) =>
                setForm({ ...form, scheduledFor: event.target.value })
              }
              required
            />
          </label>
          <label>
            Priority
            <Select
              value={form.priority}
              onChange={(event) =>
                setForm({
                  ...form,
                  priority: event.target.value as WorkOrder["priority"],
                })
              }
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </Select>
          </label>
        </div>
        <label>
          Description
          <TextArea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <Button disabled={busy}>
          {busy ? "Saving…" : "Save work order"}
        </Button>
      </form>
    </Modal>
  );
}

function WorkOrderModal({
  branches,
  onClose,
  onCreated,
}: {
  branches: Branch[];
  onClose: () => void;
  onCreated: (order: WorkOrder) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [form, setForm] = useState({
    customerId: "",
    locationId: "",
    branchId: "",
    equipmentId: "",
    agreementId: "",
    title: "",
    description: "",
    requiredSkill: "",
    priority: "normal",
    scheduledFor: new Date().toISOString().slice(0, 10),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      endpoints.customers.list("status=active&limit=100"),
      endpoints.equipment.list("status=active&limit=100"),
    ])
      .then(([c, e]) => {
        setCustomers(c);
        setEquipment(e);
        if (c[0]) {
          setForm((current) => ({ ...current, customerId: c[0].id }));
        }
      })
      .catch((c) =>
        setError(c instanceof Error ? c.message : "Unable to load form data"),
      );
  }, []);

  useEffect(() => {
    if (!form.customerId) return;
    Promise.all([
      endpoints.customers.locations(form.customerId),
      endpoints.agreements.list(
        "customer_id=" + form.customerId + "&status=active&limit=100",
      ),
      endpoints.equipment.list(
        "customer_id=" + form.customerId + "&status=active&limit=100",
      ),
    ])
      .then(([l, a, e]) => {
        setLocations(l);
        setAgreements(a);
        setEquipment(e);
        setForm((current) => ({
          ...current,
          locationId: l[0]?.id || "",
          agreementId: "",
          equipmentId: "",
        }));
      })
      .catch((c) =>
        setError(
          c instanceof Error ? c.message : "Unable to load customer context",
        ),
      );
  }, [form.customerId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const order = await endpoints.workOrders.create({
        customer_id: form.customerId,
        service_location_id: form.locationId,
        branch_id: form.branchId || null,
        equipment_id: form.equipmentId || null,
        agreement_id: form.agreementId || null,
        title: form.title,
        description: form.description || null,
        required_skill: form.requiredSkill.trim() || null,
        priority: form.priority,
        scheduled_for: form.scheduledFor,
      });
      onCreated(order);
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to create work order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New work order" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-two">
          <label>
            Customer
            <Select
              value={form.customerId}
              onChange={(e) =>
                setForm({ ...form, customerId: e.target.value })
              }
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Service location
            <Select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="form-three">
          <label className="branch-routing-field">
            Branch
            <Select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              <option value="">Automatic (recommended)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <span className="muted branch-routing-hint">
              Matches country to narrow candidates when possible, then ranks
              postal code, city, and region. With no address match it uses the
              primary candidate branch, or a deterministic fallback; with no
              active branches it stays unassigned. Choosing a branch overrides
              automatic routing.
            </span>
          </label>
          <label>
            Equipment
            <Select
              value={form.equipmentId}
              onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
            >
              <option value="">None</option>
              {equipment.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.asset_number}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Agreement
            <Select
              value={form.agreementId}
              onChange={(e) => setForm({ ...form, agreementId: e.target.value })}
            >
              <option value="">None</option>
              {agreements.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.agreement_number}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label>
          Title
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>
        <div className="form-two">
          <label>
            Scheduled date
            <Input
              type="date"
              value={form.scheduledFor}
              onChange={(e) =>
                setForm({ ...form, scheduledFor: e.target.value })
              }
              required
            />
          </label>
          <label>
            Priority
            <Select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </Select>
          </label>
        </div>
        <label>
          Description
          <TextArea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label>
          Required skill (optional)
          <Input
            value={form.requiredSkill}
            onChange={(e) => setForm({ ...form, requiredSkill: e.target.value })}
            maxLength={80}
            placeholder="AC maintenance, refrigeration, HVAC…"
          />
          <span className="muted">Only technicians with this skill can be assigned.</span>
        </label>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy || !form.locationId}>
          {busy ? "Creating…" : "Create work order"}
        </Button>
      </form>
    </Modal>
  );
}

function AssignModal({
  order,
  onClose,
  onAssigned,
}: {
  order: WorkOrder;
  onClose: () => void;
  onAssigned: (order: WorkOrder) => void;
}) {
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    endpoints.team.technicians()
      .then((items) => { if (live) setTechnicians(items); })
      .catch((cause) => {
        if (live) setError(cause instanceof Error ? cause.message : "Unable to load technician profiles");
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const requiredSkill = order.required_skill ? " ".concat(order.required_skill.split(/\s+/).filter(Boolean).join(" ")).trim().toLowerCase() : "";
  const eligibleTechnicians = technicians.filter((technician) => {
    if (!technician.is_active) return false;
    if (!order.branch_id || !technician.branch_ids.includes(order.branch_id)) return false;
    return !requiredSkill || technician.skills.some(
      (skill) => skill.split(/\s+/).filter(Boolean).join(" ").toLowerCase() === requiredSkill,
    );
  });

  const selectedIsEligible = eligibleTechnicians.some((technician) => technician.id === id);
  const firstEligibleId = eligibleTechnicians[0]?.id || "";

  useEffect(() => {
    if (!selectedIsEligible && id !== firstEligibleId) {
      setId(firstEligibleId);
    }
  }, [id, selectedIsEligible, firstEligibleId]);

  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!id || busy || loading) return;
    setBusy(true);
    setError("");
    try {
      const updated = await endpoints.workOrders.action(order.id, "assign", {
        technician_user_id: id,
      });
      onAssigned(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to assign technician");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={"Assign " + order.work_order_number} onClose={onClose}>
      <form className="form-grid" onSubmit={assign}>
        <p className="muted">
          Only active technicians assigned to this branch and matching the required skill are shown.
        </p>
        {loading ? (
          <div className="center-load"><Spinner /></div>
        ) : eligibleTechnicians.length ? (
          <label>
            Eligible technician
            <Select value={id} onChange={(event) => setId(event.target.value)}>
              {eligibleTechnicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.full_name} · {technician.email}
                </option>
              ))}
            </Select>
          </label>
        ) : (
          <div className="empty-state" role="status">
            <strong>No compatible technician found</strong>
            <p>
              {!order.branch_id
                ? "This work order has no branch. Set a branch before assigning a technician."
                : order.required_skill
                  ? "Add the required skill to an active technician in this branch, or update the work order's skill requirement."
                  : "Add an active technician to this branch before assigning the work."}
            </p>
          </div>
        )}
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="modal-actions">
          <Button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button disabled={loading || busy || !id}>
            {busy ? "Assigning…" : "Assign technician"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CompleteModal({
  order,
  checklist,
  onClose,
  onComplete,
}: {
  order: WorkOrder;
  checklist: string[];
  onClose: () => void;
  onComplete: (body: unknown) => void;
}) {
  const [notes, setNotes] = useState("");
  const [findings, setFindings] = useState("");
  const [signoff, setSignoff] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(checklist.map((item) => [item, false])),
  );

  return (
    <Modal title={"Complete " + order.work_order_number} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onComplete({
            completion_notes: notes || null,
            technician_findings: findings || null,
            checklist_results: checks,
            customer_signoff_name: signoff || null,
          });
        }}
      >
        <label>
          Completion notes
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label>
          Technician findings
          <TextArea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
          />
        </label>
        <label>
          Customer sign-off
          <Input
            value={signoff}
            onChange={(e) => setSignoff(e.target.value)}
          />
        </label>
        {checklist.length > 0 && (
          <div className="checklist">
            <span className="eyebrow">Required checklist</span>
            {checklist.map((item) => (
              <label className="check-item" key={item}>
                <input
                  type="checkbox"
                  checked={Boolean(checks[item])}
                  onChange={(e) =>
                    setChecks((current) => ({
                      ...current,
                      [item]: e.target.checked,
                    }))
                  }
                />
                {item}
              </label>
            ))}
          </div>
        )}
        <Button>Complete work order</Button>
      </form>
    </Modal>
  );
}

function ReasonAction({
  title,
  actionLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  actionLabel: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason);
        }}
      >
        <label>
          Reason
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            required
          />
        </label>
        <Button className="btn-danger">{actionLabel}</Button>
      </form>
    </Modal>
  );
}

function SchedulesTable({
  schedules,
  onGenerated,
  onUpdated,
}: {
  schedules: Schedule[];
  onGenerated: (order: WorkOrder) => void;
  onUpdated: (schedule: Schedule) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [error, setError] = useState("");

  return (
    <div>
      {error && (
        <div className="error-banner page-error" role="alert">
          {error}
        </div>
      )}
      <Card>
        {schedules.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Frequency</th>
                  <th>Next due</th>
                  <th>Checklist</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td>
                      <strong>{schedule.name}</strong>
                      <span className="table-sub">
                        {schedule.description || "No description"}
                      </span>
                      <span className="table-sub">
                        {schedule.required_skill ? "Required skill: " + schedule.required_skill : "No skill restriction"}
                      </span>
                    </td>
                    <td className="capitalize">
                      {schedule.frequency.replace("_", " ")}
                    </td>
                    <td>{schedule.next_due_date}</td>
                    <td>{schedule.checklist_template.length} items</td>
                    <td>
                      <Badge tone={schedule.is_active ? "success" : "neutral"}>
                        {schedule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-button"
                          onClick={() => setEditing(schedule)}
                        >
                          Edit
                        </button>
                        {schedule.is_active && (
                          <button
                            className="text-button"
                            disabled={busy === schedule.id}
                            onClick={async () => {
                              setBusy(schedule.id);
                              setError("");
                              try {
                                onGenerated(
                                  await endpoints.schedules.generate(
                                    schedule.id,
                                    {
                                      occurrence_date: schedule.next_due_date,
                                    },
                                  ),
                                );
                              } catch (cause) {
                                setError(
                                  cause instanceof Error
                                    ? cause.message
                                    : "Unable to generate work order",
                                );
                              } finally {
                                setBusy(null);
                              }
                            }}
                          >
                            {busy === schedule.id
                              ? "Generating…"
                              : "Generate order"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No maintenance plans"
            description="Create recurring maintenance to generate repeatable work orders."
          />
        )}
      </Card>
      {editing && (
        <ScheduleEditModal
          schedule={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ScheduleEditModal({
  schedule,
  onClose,
  onSaved,
}: {
  schedule: Schedule;
  onClose: () => void;
  onSaved: (schedule: Schedule) => void;
}) {
  const [form, setForm] = useState({
    name: schedule.name,
    description: schedule.description || "",
    requiredSkill: schedule.required_skill || "",
    frequency: schedule.frequency,
    nextDueDate: schedule.next_due_date,
    checklist: schedule.checklist_template.join("\n"),
    isActive: schedule.is_active,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const checklist = form.checklist
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (new Set(checklist).size !== checklist.length) {
      setError("Checklist entries must be unique.");
      setBusy(false);
      return;
    }

    try {
      const updated = (await endpoints.schedules.update(schedule.id, {
        name: form.name,
        description: form.description || null,
        required_skill: form.requiredSkill.trim() || null,
        frequency: form.frequency,
        next_due_date: form.nextDueDate,
        checklist_template: checklist,
        is_active: form.isActive,
      })) as Schedule;
      onSaved(updated);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update maintenance plan",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Edit maintenance plan" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Plan name
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            minLength={2}
            required
          />
        </label>
        <label>
          Description
          <TextArea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        <label>
          Required skill (optional)
          <Input
            value={form.requiredSkill}
            onChange={(event) => setForm({ ...form, requiredSkill: event.target.value })}
            maxLength={80}
            placeholder="AC maintenance, refrigeration, HVAC…"
          />
        </label>
        <div className="form-two">
          <label>
            Frequency
            <Select
              value={form.frequency}
              onChange={(event) =>
                setForm({ ...form, frequency: event.target.value })
              }
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi_annual">Semi-annual</option>
              <option value="annual">Annual</option>
            </Select>
          </label>
          <label>
            Next due date
            <Input
              type="date"
              value={form.nextDueDate}
              onChange={(event) =>
                setForm({ ...form, nextDueDate: event.target.value })
              }
              required
            />
          </label>
        </div>
        <label>
          Checklist, one item per line
          <TextArea
            value={form.checklist}
            onChange={(event) =>
              setForm({ ...form, checklist: event.target.value })
            }
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm({ ...form, isActive: event.target.checked })
            }
          />{" "}
          Maintenance plan is active
        </label>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <Button disabled={busy}>
          {busy ? "Saving…" : "Save maintenance plan"}
        </Button>
      </form>
    </Modal>
  );
}

function ScheduleModal({
  branches,
  onClose,
  onCreated,
}: {
  branches: Branch[];
  onClose: () => void;
  onCreated: (schedule: Schedule) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [form, setForm] = useState({
    customerId: "",
    locationId: "",
    branchId: "",
    name: "",
    description: "",
    requiredSkill: "",
    frequency: "annual",
    nextDueDate: new Date().toISOString().slice(0, 10),
    checklist: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    endpoints.customers
      .list("status=active&limit=100")
      .then((items) => {
        setCustomers(items);
        if (items[0]) {
          setForm((x) => ({ ...x, customerId: items[0].id }));
        }
      })
      .catch((c) =>
        setError(c instanceof Error ? c.message : "Unable to load customers"),
      );
  }, []);

  useEffect(() => {
    if (!form.customerId) return;
    endpoints.customers
      .locations(form.customerId)
      .then((items) => {
        setLocations(items);
        setForm((x) => ({ ...x, locationId: items[0]?.id || "" }));
      })
      .catch((c) =>
        setError(c instanceof Error ? c.message : "Unable to load locations"),
      );
  }, [form.customerId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      onCreated(
        (await endpoints.schedules.create({
          customer_id: form.customerId,
          service_location_id: form.locationId,
          branch_id: form.branchId || null,
          name: form.name,
          description: form.description || null,
          required_skill: form.requiredSkill.trim() || null,
          frequency: form.frequency,
          next_due_date: form.nextDueDate,
          checklist_template: form.checklist
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        })) as Schedule,
      );
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to create plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New maintenance plan" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-two">
          <label>
            Customer
            <Select
              value={form.customerId}
              onChange={(e) =>
                setForm({ ...form, customerId: e.target.value })
              }
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Service location
            <Select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label>
          Required skill (optional)
          <Input
            value={form.requiredSkill}
            onChange={(e) => setForm({ ...form, requiredSkill: e.target.value })}
            maxLength={80}
            placeholder="AC maintenance, refrigeration, HVAC…"
          />
          <span className="muted">Generated work orders inherit this skill requirement.</span>
        </label>
        <div className="form-two">
          <label className="branch-routing-field">
            Branch
            <Select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              <option value="">Automatic (recommended)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <span className="muted branch-routing-hint">
              Matches country to narrow candidates when possible, then ranks
              postal code, city, and region. With no address match it uses the
              primary candidate branch, or a deterministic fallback; with no
              active branches it stays unassigned. Choosing a branch overrides
              automatic routing.
            </span>
          </label>
          <label>
            Frequency
            <Select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi_annual">Semi-annual</option>
              <option value="annual">Annual</option>
            </Select>
          </label>
        </div>
        <label>
          Plan name
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label>
          Next due date
          <Input
            type="date"
            value={form.nextDueDate}
            onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
            required
          />
        </label>
        <label>
          Checklist, one item per line
          <TextArea
            value={form.checklist}
            onChange={(e) => setForm({ ...form, checklist: e.target.value })}
          />
        </label>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy || !form.locationId}>
          {busy ? "Creating…" : "Create maintenance plan"}
        </Button>
      </form>
    </Modal>
  );
}

function BranchesTable({
  branches,
  onUpdated,
}: {
  branches: Branch[];
  onUpdated: (branch: Branch) => void;
}) {
  const [selected, setSelected] = useState<Branch | null>(null);

  return (
    <Card>
      {branches.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Code</th>
                <th>Timezone</th>
                <th>Location</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => setSelected(branch)}
                    >
                      <strong>{branch.name}</strong>
                      {branch.is_primary && (
                        <span className="table-sub">Primary</span>
                      )}
                    </button>
                  </td>
                  <td>{branch.code}</td>
                  <td>{branch.timezone}</td>
                  <td>
                    {[branch.city, branch.region, branch.country_code]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td>
                    <Badge tone={branch.is_active ? "success" : "neutral"}>
                      {branch.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setSelected(branch)}
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
          title="No branches"
          description="Create a branch to model local business hours and dispatch context."
        />
      )}
      {selected && (
        <BranchDetails
          branch={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            onUpdated(updated);
            setSelected(updated);
          }}
        />
      )}
    </Card>
  );
}

function BranchModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (branch: Branch) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    timezone: "UTC",
    countryCode: "US",
    address1: "",
    city: "",
    region: "",
    postalCode: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      onCreated(
        await endpoints.branches.create({
          name: form.name,
          code: form.code,
          timezone: form.timezone,
          country_code: form.countryCode,
          address_line1: form.address1 || null,
          city: form.city || null,
          region: form.region || null,
          postal_code: form.postalCode || null,
          phone: form.phone || null,
          email: form.email || null,
        }),
      );
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to create branch");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add branch" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-two">
          <label>
            Name
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Code
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-two">
          <label>
            Timezone
            <Input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              required
            />
          </label>
          <label>
            Country code
            <Input
              maxLength={2}
              value={form.countryCode}
              onChange={(e) =>
                setForm({ ...form, countryCode: e.target.value })
              }
              required
            />
          </label>
        </div>
        <label>
          Address line 1
          <Input
            value={form.address1}
            onChange={(e) => setForm({ ...form, address1: e.target.value })}
          />
        </label>
        <div className="form-three">
          <label>
            City
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
          <label>
            Region/state
            <Input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            />
          </label>
          <label>
            Postal code
            <Input
              value={form.postalCode}
              onChange={(e) =>
                setForm({ ...form, postalCode: e.target.value })
              }
            />
          </label>
        </div>
        <div className="form-two">
          <label>
            Phone
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            Email
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy}>
          {busy ? "Creating…" : "Create branch"}
        </Button>
      </form>
    </Modal>
  );
}

type HoursEntry = {
  day_of_week: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
};
type Closure = {
  id: string;
  closure_date: string;
  name: string;
  description: string | null;
};

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function BranchDetails({
  branch,
  onClose,
  onUpdated,
}: {
  branch: Branch;
  onClose: () => void;
  onUpdated: (branch: Branch) => void;
}) {
  const [hours, setHours] = useState<HoursEntry[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    name: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      endpoints.branches.hours(branch.id),
      endpoints.branches.closures(branch.id),
    ])
      .then(([h, c]) => {
        setHours(
          (h as HoursEntry[]).map((item) => ({
            ...item,
            opens_at: item.opens_at?.slice(0, 5) || null,
            closes_at: item.closes_at?.slice(0, 5) || null,
          })),
        );
        setClosures(c as Closure[]);
      })
      .catch((c) =>
        setError(
          c instanceof Error ? c.message : "Unable to load branch details",
        ),
      );
  }, [branch.id]);

  function setDay(day: number, patch: Partial<HoursEntry>) {
    setHours((current) =>
      current.map((item) =>
        item.day_of_week === day ? { ...item, ...patch } : item,
      ),
    );
  }

  async function saveHours() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const updated = await endpoints.branches.replaceHours(branch.id, {
        hours: hours.map((item) => ({
          day_of_week: item.day_of_week,
          is_closed: item.is_closed,
          opens_at: item.is_closed ? null : item.opens_at,
          closes_at: item.is_closed ? null : item.closes_at,
        })),
      });
      setHours(
        (updated as HoursEntry[]).map((item) => ({
          ...item,
          opens_at: item.opens_at?.slice(0, 5) || null,
          closes_at: item.closes_at?.slice(0, 5) || null,
        })),
      );
      setMessage("Business hours saved.");
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to save hours");
    } finally {
      setBusy(false);
    }
  }

  async function addClosure(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const created = await endpoints.branches.addClosure(branch.id, {
        closure_date: form.date,
        name: form.name,
        description: form.description || null,
      });
      setClosures((current) =>
        [...current, created as Closure].sort((a, b) =>
          a.closure_date.localeCompare(b.closure_date),
        ),
      );
      setForm({
        date: new Date().toISOString().slice(0, 10),
        name: "",
        description: "",
      });
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to add closure");
    } finally {
      setBusy(false);
    }
  }

  async function removeClosure(id: string) {
    if (!window.confirm("Remove this closure?")) return;

    try {
      await endpoints.branches.deleteClosure(branch.id, id);
      setClosures((current) => current.filter((item) => item.id !== id));
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to remove closure");
    }
  }

  return (
    <Modal title={branch.name} onClose={onClose}>
      <div className="drawer-meta">
        <div>
          <strong>{branch.code}</strong>
          <span className="muted">
            {branch.timezone} ·{" "}
            {[branch.city, branch.region, branch.country_code]
              .filter(Boolean)
              .join(", ")}
          </span>
        </div>
        <Badge tone={branch.is_active ? "success" : "neutral"}>
          {branch.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
      <div className="section-action-row">
        <span className="muted">
          {branch.phone || "No phone"}
          {branch.email ? " · " + branch.email : ""}
        </span>
        <Button
          className="btn-secondary"
          onClick={() => setEditOpen(true)}
        >
          Edit branch
        </Button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {message && <div className="success-banner">{message}</div>}
      <div className="branch-detail-section">
        <div className="card-title-row">
          <div>
            <span className="eyebrow">Weekly schedule</span>
            <h3>Business hours</h3>
          </div>
          <Button
            className="btn-secondary"
            disabled={busy || hours.length !== 7}
            onClick={() => void saveHours()}
          >
            Save hours
          </Button>
        </div>
        {hours.length ? (
          <div className="hours-list">
            {hours.map((item) => (
              <div className="hours-row" key={item.day_of_week}>
                <strong>{dayNames[item.day_of_week]}</strong>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={item.is_closed}
                    onChange={(e) =>
                      setDay(item.day_of_week, { is_closed: e.target.checked })
                    }
                  />{" "}
                  Closed
                </label>
                {item.is_closed ? (
                  <span className="muted">Closed</span>
                ) : (
                  <>
                    <Input
                      type="time"
                      value={item.opens_at || ""}
                      onChange={(e) =>
                        setDay(item.day_of_week, { opens_at: e.target.value })
                      }
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={item.closes_at || ""}
                      onChange={(e) =>
                        setDay(item.day_of_week, { closes_at: e.target.value })
                      }
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="center-load">
            <Spinner />
          </div>
        )}
      </div>
      <div className="branch-detail-section">
        <span className="eyebrow">Closures</span>
        <h3>Upcoming closed dates</h3>
        {closures.length ? (
          <div className="list">
            {closures.map((item) => (
              <div className="list-row" key={item.id}>
                <div>
                  <strong>
                    {item.closure_date} · {item.name}
                  </strong>
                  <span>{item.description || "Closed all day"}</span>
                </div>
                <button
                  className="text-button danger-text"
                  onClick={() => void removeClosure(item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No closures"
            description="Add holidays, training days or other non-service dates."
          />
        )}
        <form className="form-grid closure-form" onSubmit={addClosure}>
          <div className="form-two">
            <label>
              Date
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label>
              Name
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                minLength={2}
                required
              />
            </label>
          </div>
          <label>
            Description
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <Button disabled={busy}>{busy ? "Saving…" : "Add closure"}</Button>
        </form>
      </div>
      {editOpen && (
        <BranchEditModal
          branch={branch}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditOpen(false);
            setMessage("Branch details saved.");
          }}
        />
      )}
    </Modal>
  );
}

function BranchEditModal({
  branch,
  onClose,
  onSaved,
}: {
  branch: Branch;
  onClose: () => void;
  onSaved: (branch: Branch) => void;
}) {
  const [form, setForm] = useState({
    name: branch.name,
    code: branch.code,
    timezone: branch.timezone,
    address1: branch.address_line1 || "",
    address2: branch.address_line2 || "",
    city: branch.city || "",
    region: branch.region || "",
    postalCode: branch.postal_code || "",
    countryCode: branch.country_code,
    phone: branch.phone || "",
    email: branch.email || "",
    isPrimary: branch.is_primary,
    isActive: branch.is_active,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const updated = (await endpoints.branches.update(branch.id, {
        name: form.name,
        code: form.code,
        timezone: form.timezone,
        address_line1: form.address1 || null,
        address_line2: form.address2 || null,
        city: form.city || null,
        region: form.region || null,
        postal_code: form.postalCode || null,
        country_code: form.countryCode,
        phone: form.phone || null,
        email: form.email || null,
        is_primary: form.isPrimary,
        is_active: form.isActive,
      })) as Branch;
      onSaved(updated);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update branch",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={"Edit branch · " + branch.name} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-two">
          <label>
            Branch name
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              minLength={2}
              required
            />
          </label>
          <label>
            Branch code
            <Input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              minLength={2}
              required
            />
          </label>
        </div>
        <label>
          Timezone
          <Input
            value={form.timezone}
            onChange={(event) =>
              setForm({ ...form, timezone: event.target.value })
            }
            placeholder="Europe/London"
            required
          />
        </label>
        <div className="form-two">
          <label>
            Address line 1
            <Input
              value={form.address1}
              onChange={(event) =>
                setForm({ ...form, address1: event.target.value })
              }
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
        </div>
        <div className="form-three">
          <label>
            City
            <Input
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
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
          <label>
            Postal code
            <Input
              value={form.postalCode}
              onChange={(event) =>
                setForm({ ...form, postalCode: event.target.value })
              }
            />
          </label>
        </div>
        <div className="form-two">
          <label>
            Country code
            <Input
              maxLength={2}
              value={form.countryCode}
              onChange={(event) =>
                setForm({ ...form, countryCode: event.target.value.toUpperCase() })
              }
              minLength={2}
              required
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
          Email
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <div className="form-two">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(event) =>
                setForm({ ...form, isPrimary: event.target.checked })
              }
            />{" "}
            Primary branch
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm({ ...form, isActive: event.target.checked })
              }
            />{" "}
            Active
          </label>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <Button disabled={busy}>
          {busy ? "Saving…" : "Save branch"}
        </Button>
      </form>
    </Modal>
  );
}

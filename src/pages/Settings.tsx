import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import type { Branch, Company, Customer, TechnicianInvitation, TechnicianProfile, User } from "../types";
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
} from "../components/ui";

type RecurringSchedule = {
  id: string;
  name: string;
  frequency: string;
  next_invoice_date: string;
  auto_issue: boolean;
  is_active: boolean;
  last_run_error: string | null;
};

export function SettingsPage() {
  const [tab, setTab] = useState<
    "company" | "team" | "security" | "recurring"
  >("company");
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [recurring, setRecurring] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      endpoints.company.get(),
      endpoints.users.list("limit=100"),
      endpoints.recurring.list(),
    ])
      .then(([companyData, userData, recurringData]) => {
        setCompany(companyData);
        setUsers(userData);
        setRecurring(recurringData as RecurringSchedule[]);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load settings",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="center-load">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Manage company identity, team access, password security and recurring billing schedules."
      />
      <div className="module-tabs">
        <button
          className={tab === "company" ? "module-tab active" : "module-tab"}
          onClick={() => setTab("company")}
        >
          Company
        </button>
        <button
          className={tab === "team" ? "module-tab active" : "module-tab"}
          onClick={() => setTab("team")}
        >
          Team
        </button>
        <button
          className={tab === "security" ? "module-tab active" : "module-tab"}
          onClick={() => setTab("security")}
        >
          Security
        </button>
        <button
          className={tab === "recurring" ? "module-tab active" : "module-tab"}
          onClick={() => setTab("recurring")}
        >
          Recurring billing
        </button>
      </div>
      {error && <div className="error-banner page-error">{error}</div>}
      {tab === "company" && company && (
        <CompanyPanel company={company} onSaved={setCompany} />
      )}
      {tab === "team" && (
        <TeamPanel
          users={users}
          onChanged={(user) =>
            setUsers((current) =>
              current.map((item) => (item.id === user.id ? user : item)),
            )
          }
        />
      )}
      {tab === "security" && <SecurityPanel />}
      {tab === "recurring" && (
        <RecurringPanel schedules={recurring} onChanged={setRecurring} />
      )}
    </div>
  );
}

function CompanyPanel({
  company,
  onSaved,
}: {
  company: Company;
  onSaved: (company: Company) => void;
}) {
  const [form, setForm] = useState({
    name: company.name,
    legalName: company.legal_name || "",
    timezone: company.timezone,
    currency: company.currency,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      onSaved(
        await endpoints.company.update({
          name: form.name,
          legal_name: form.legalName || null,
          timezone: form.timezone,
          currency: form.currency,
        }),
      );
      setMessage("Company settings saved.");
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Unable to save company",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form className="settings-form form-grid" onSubmit={submit}>
        <div>
          <span className="eyebrow">Workspace identity</span>
          <h3>{company.name}</h3>
        </div>
        <label>
          Company name
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            minLength={2}
            required
          />
        </label>
        <label>
          Legal name
          <Input
            value={form.legalName}
            onChange={(event) =>
              setForm({ ...form, legalName: event.target.value })
            }
          />
        </label>
        <div className="form-two">
          <label>
            Timezone
            <Input
              value={form.timezone}
              onChange={(event) =>
                setForm({ ...form, timezone: event.target.value })
              }
            />
          </label>
          <label>
            Currency
            <Select
              value={form.currency}
              onChange={(event) =>
                setForm({ ...form, currency: event.target.value })
              }
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
            </Select>
          </label>
        </div>
        {message && (
          <div
            className={
              message === "Company settings saved."
                ? "success-banner"
                : "error-banner"
            }
          >
            {message}
          </div>
        )}
        <Button disabled={busy}>
          {busy ? "Saving…" : "Save company settings"}
        </Button>
      </form>
    </Card>
  );
}

function TeamPanel({
  users,
  onChanged,
}: {
  users: User[];
  onChanged: (user: User) => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [invitations, setInvitations] = useState<TechnicianInvitation[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TechnicianProfile | null>(null);

  async function reload() {
    setError("");
    try {
      const [branchData, invitationData, technicianData] = await Promise.all([
        endpoints.branches.list("limit=100"),
        endpoints.team.invitations(),
        endpoints.team.technicians(),
      ]);
      setBranches(branchData.filter((branch) => branch.is_active));
      setInvitations(invitationData);
      setTechnicians(technicianData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load team invitations and technician profiles");
    } finally {
      setLoadingTeam(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  async function toggleUser(user: User) {
    setError("");
    try {
      onChanged(await endpoints.users.update(user.id, { is_active: !user.is_active }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update team member");
    }
  }

  async function revoke(invitation: TechnicianInvitation) {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}?`)) return;
    try {
      await endpoints.team.revokeInvitation(invitation.id);
      setInvitations((current) => current.map((item) =>
        item.id === invitation.id ? { ...item, status: "revoked" } : item
      ));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to revoke invitation");
    }
  }

  return (
    <div className="form-grid">
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="page-actions settings-action">
        <div>
          <h3>Technicians</h3>
          <p className="muted">Invite technicians to set their own password, assign branches and record skills such as AC maintenance or refrigeration.</p>
        </div>
        <Button disabled={!branches.length} onClick={() => setInviteOpen(true)}>Invite technician</Button>
      </div>
      {!branches.length && (
        <div className="error-banner">There are no active branches. Activate or create a branch before inviting a technician.</div>
      )}
      <Card>
        {loadingTeam ? <div className="center-load"><Spinner /></div> : technicians.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Technician</th><th>Skills</th><th>Branches</th><th>Status</th><th /></tr></thead>
              <tbody>
                {technicians.map((technician) => (
                  <tr key={technician.id}>
                    <td><strong>{technician.full_name}</strong><span className="table-sub">{technician.email}</span></td>
                    <td>{technician.skills.length ? technician.skills.join(", ") : "No skills recorded"}</td>
                    <td>{technician.branch_names.length ? technician.branch_names.join(", ") : "All branches (legacy account)"}</td>
                    <td><Badge tone={technician.is_active ? "success" : "neutral"}>{technician.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td><button className="text-button" onClick={() => setEditing(technician)}>Skills & branches</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No technicians yet" description="Invite a technician to give them their own login and a defined branch/skill profile." />}
      </Card>

      <div>
        <h3>Invitations</h3>
        <p className="muted">Pending invitations expire automatically. Revoke an invitation if it was sent to the wrong person.</p>
      </div>
      <Card>
        {loadingTeam ? <div className="center-load"><Spinner /></div> : invitations.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invitee</th><th>Skills</th><th>Branches</th><th>Status</th><th>Expires</th><th /></tr></thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td><strong>{invitation.full_name}</strong><span className="table-sub">{invitation.email}</span></td>
                    <td>{invitation.skills.length ? invitation.skills.join(", ") : "Not specified"}</td>
                    <td>{invitation.branch_ids.length ? invitation.branch_ids.map((id) => branches.find((branch) => branch.id === id)?.name || "Inactive branch").join(", ") : "All active branches"}</td>
                    <td><Badge tone={invitation.status === "accepted" ? "success" : invitation.status === "pending" ? "info" : "neutral"}>{invitation.status}</Badge></td>
                    <td>{new Date(invitation.expires_at).toLocaleDateString()}</td>
                    <td>{invitation.status === "pending" && <button className="text-button" onClick={() => void revoke(invitation)}>Revoke</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No invitations" description="Technician invitations and their status will appear here." />}
      </Card>

      <div>
        <h3>Existing internal accounts</h3>
        <p className="muted">This list includes existing owner, admin, billing and staff accounts. New technicians must use an invitation.</p>
      </div>
      <Card>
        {users.filter((member) => member.role !== "technician").length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Role</th><th>Status</th><th /></tr></thead>
              <tbody>
                {users.filter((member) => member.role !== "technician").map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.full_name}</strong><span className="table-sub">{member.email}</span></td>
                    <td className="capitalize">{member.role}</td>
                    <td><Badge tone={member.is_active ? "success" : "neutral"}>{member.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td>{member.role !== "owner" && <button className="text-button" onClick={() => void toggleUser(member)}>{member.is_active ? "Deactivate" : "Activate"}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No other internal accounts" description="The company owner is the primary administrator." />}
      </Card>

      {inviteOpen && <TechnicianInvitationModal
        branches={branches}
        onClose={() => setInviteOpen(false)}
        onInvited={(invitation) => {
          setInvitations((current) => [invitation, ...current]);
          setInviteOpen(false);
        }}
      />}
      {editing && <TechnicianProfileModal
        technician={editing}
        branches={branches}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setTechnicians((current) => current.map((item) => item.id === updated.id ? updated : item));
          setEditing(null);
        }}
      />}
    </div>
  );
}

function TechnicianInvitationModal({
  branches,
  onClose,
  onInvited,
}: {
  branches: Branch[];
  onClose: () => void;
  onInvited: (invitation: TechnicianInvitation) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branchIds, setBranchIds] = useState<string[]>(branches.map((branch) => branch.id));
  const [skills, setSkills] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleBranch(id: string) {
    setBranchIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await endpoints.team.inviteTechnician({
        full_name: name,
        email,
        branch_ids: branchIds,
        skills: skills.split(/[,\n]/).map((value) => value.trim()).filter(Boolean),
      });
      onInvited(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to invite technician");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Invite technician" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <p className="muted">The technician receives a one-time invitation and chooses their own password. You never need to create or know their password.</p>
        <label>Full name<Input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={160} required /></label>
        <label>Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value.trim())} required /></label>
        <fieldset className="form-grid" style={{ border: "1px solid var(--border, #d8dde5)", borderRadius: 10, padding: 12 }}>
          <legend>Branches</legend>
          {branches.map((branch) => <label key={branch.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={branchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} />
            <span>{branch.name}</span>
          </label>)}
          <span className="muted">Select every branch where this technician is allowed to work.</span>
        </fieldset>
        <label>Skills / specializations<Input value={skills} onChange={(event) => setSkills(event.target.value)} maxLength={2000} placeholder="AC maintenance, Refrigeration, HVAC" /></label>
        <p className="muted">Separate skills with commas. Skills help dispatch validate assignments; they are not account roles.</p>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="modal-actions"><Button type="button" className="btn-secondary" onClick={onClose}>Cancel</Button><Button disabled={busy || !name.trim() || !email.trim() || !branchIds.length}>{busy ? "Sending invitation…" : "Send invitation"}</Button></div>
      </form>
    </Modal>
  );
}

function TechnicianProfileModal({
  technician,
  branches,
  onClose,
  onSaved,
}: {
  technician: TechnicianProfile;
  branches: Branch[];
  onClose: () => void;
  onSaved: (technician: TechnicianProfile) => void;
}) {
  const [branchIds, setBranchIds] = useState<string[]>(technician.branch_ids.length ? technician.branch_ids : branches.map((branch) => branch.id));
  const [skills, setSkills] = useState(technician.skills.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleBranch(id: string) {
    setBranchIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const updated = await endpoints.team.updateTechnician(technician.id, {
        branch_ids: branchIds,
        skills: skills.split(/[,\n]/).map((value) => value.trim()).filter(Boolean),
      });
      onSaved(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update technician profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Skills & branches · ${technician.full_name}`} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>Skills / specializations<Input value={skills} onChange={(event) => setSkills(event.target.value)} maxLength={2000} placeholder="AC maintenance, Refrigeration" /></label>
        <fieldset className="form-grid" style={{ border: "1px solid var(--border, #d8dde5)", borderRadius: 10, padding: 12 }}>
          <legend>Eligible branches</legend>
          {branches.map((branch) => <label key={branch.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={branchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} />
            <span>{branch.name}</span>
          </label>)}
        </fieldset>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div className="modal-actions"><Button type="button" className="btn-secondary" onClick={onClose}>Cancel</Button><Button disabled={busy || !branchIds.length}>{busy ? "Saving…" : "Save technician profile"}</Button></div>
      </form>
    </Modal>
  );
}

function SecurityPanel() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (form.next !== form.confirm) {
      setMessage("New passwords do not match.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await endpoints.auth.changePassword({
        current_password: form.current,
        new_password: form.next,
      });
      setForm({ current: "", next: "", confirm: "" });
      setMessage("Password changed. Other sessions have been revoked.");
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Unable to change password",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form className="form-grid settings-form" onSubmit={submit}>
        <div>
          <span className="eyebrow">Account security</span>
          <h3>Change password</h3>
        </div>
        <label>
          Current password
          <Input
            type="password"
            value={form.current}
            onChange={(event) =>
              setForm({ ...form, current: event.target.value })
            }
            required
          />
        </label>
        <div className="form-two">
          <label>
            New password
            <Input
              type="password"
              minLength={12}
              value={form.next}
              onChange={(event) => setForm({ ...form, next: event.target.value })}
              required
            />
          </label>
          <label>
            Confirm new password
            <Input
              type="password"
              minLength={12}
              value={form.confirm}
              onChange={(event) =>
                setForm({ ...form, confirm: event.target.value })
              }
              required
            />
          </label>
        </div>
        {message && (
          <div
            className={
              message.startsWith("Password")
                ? "success-banner"
                : "error-banner"
            }
          >
            {message}
          </div>
        )}
        <Button disabled={busy}>
          {busy ? "Changing…" : "Change password"}
        </Button>
      </form>
    </Card>
  );
}

function RecurringPanel({
  schedules,
  onChanged,
}: {
  schedules: RecurringSchedule[];
  onChanged: (next: RecurringSchedule[]) => void;
}) {
  const [open, setOpen] = useState(false);

  async function toggle(item: RecurringSchedule) {
    try {
      const updated = (await endpoints.recurring.action(
        item.id,
        item.is_active ? "pause" : "resume",
      )) as RecurringSchedule;
      onChanged(
        schedules.map((current) => (current.id === item.id ? updated : current)),
      );
    } catch {}
  }

  return (
    <div>
      <div className="page-actions settings-action">
        <Button onClick={() => setOpen(true)}>Add recurring schedule</Button>
      </div>
      <Card>
        {schedules.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Schedule</th>
                  <th>Frequency</th>
                  <th>Next invoice</th>
                  <th>Auto issue</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {schedules.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span className="table-sub">
                        {item.last_run_error || "Recurring invoice template"}
                      </span>
                    </td>
                    <td className="capitalize">
                      {item.frequency.replace("_", " ")}
                    </td>
                    <td>{item.next_invoice_date}</td>
                    <td>{item.auto_issue ? "Yes" : "No"}</td>
                    <td>
                      <Badge tone={item.is_active ? "success" : "neutral"}>
                        {item.is_active ? "Active" : "Paused"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => void toggle(item)}
                      >
                        {item.is_active ? "Pause" : "Resume"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No recurring billing"
            description="Create a schedule to generate repeat invoices automatically."
          />
        )}
      </Card>
      {open && (
        <RecurringModal
          onClose={() => setOpen(false)}
          onCreated={(item) => {
            onChanged([item as RecurringSchedule, ...schedules]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RecurringModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (item: unknown) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [agreements, setAgreements] = useState<
    Array<{ id: string; agreement_number: string }>
  >([]);
  const [form, setForm] = useState({
    customerId: "",
    locationId: "",
    agreementId: "",
    name: "",
    frequency: "monthly",
    nextDate: new Date().toISOString().slice(0, 10),
    dueDays: "30",
    code: "SERVICE",
    description: "Service",
    price: "0",
    autoIssue: true,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    endpoints.customers
      .list("status=active&limit=100")
      .then((items) => {
        setCustomers(items);
        if (items[0]) {
          setForm((current) => ({ ...current, customerId: items[0].id }));
        }
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load customers",
        ),
      );
  }, []);

  useEffect(() => {
    if (!form.customerId) return;

    Promise.all([
      endpoints.customers.locations(form.customerId),
      endpoints.agreements.list(
        "customer_id=" + form.customerId + "&status=active&limit=100",
      ),
    ])
      .then(([locationsData, agreementData]) => {
        setLocations(locationsData);
        setAgreements(agreementData);
        setForm((current) => ({
          ...current,
          locationId: locationsData[0]?.id || "",
          agreementId: agreementData[0]?.id || "",
        }));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load customer context",
        ),
      );
  }, [form.customerId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const item = await endpoints.recurring.create({
        customer_id: form.customerId,
        service_location_id: form.locationId || null,
        agreement_id: form.agreementId || null,
        name: form.name,
        frequency: form.frequency,
        next_invoice_date: form.nextDate,
        due_days: Number(form.dueDays),
        auto_issue: form.autoIssue,
        lines: [
          {
            service_code: form.code,
            description: form.description,
            quantity: "1",
            unit_price: form.price,
          },
        ],
      });
      onCreated(item);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create recurring schedule",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add recurring invoice schedule" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-two">
          <label>
            Customer
            <Select
              value={form.customerId}
              onChange={(event) =>
                setForm({ ...form, customerId: event.target.value })
              }
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Service location
            <Select
              value={form.locationId}
              onChange={(event) =>
                setForm({ ...form, locationId: event.target.value })
              }
            >
              <option value="">None</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label>
          Agreement
          <Select
            value={form.agreementId}
            onChange={(event) =>
              setForm({ ...form, agreementId: event.target.value })
            }
          >
            <option value="">None</option>
            {agreements.map((agreement) => (
              <option key={agreement.id} value={agreement.id}>
                {agreement.agreement_number}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Name
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            minLength={2}
            required
          />
        </label>
        <div className="form-three">
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
            Next invoice
            <Input
              type="date"
              value={form.nextDate}
              onChange={(event) => setForm({ ...form, nextDate: event.target.value })}
              required
            />
          </label>
          <label>
            Due days
            <Input
              type="number"
              min="0"
              max="365"
              value={form.dueDays}
              onChange={(event) => setForm({ ...form, dueDays: event.target.value })}
            />
          </label>
        </div>
        <div className="form-three">
          <label>
            Service code
            <Input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              required
            />
          </label>
          <label>
            Description
            <Input
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              required
            />
          </label>
          <label>
            Unit price
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              required
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.autoIssue}
            onChange={(event) =>
              setForm({ ...form, autoIssue: event.target.checked })
            }
          />{" "}
          Auto-issue invoices
        </label>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy || !form.customerId}>
          {busy ? "Creating…" : "Create schedule"}
        </Button>
      </form>
    </Modal>
  );
}

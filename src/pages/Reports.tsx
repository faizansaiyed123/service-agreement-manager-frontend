import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from "../components/ui";

type Summary = Record<string, unknown>;

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

export function ReportsPage() {
  const [agreement, setAgreement] = useState<Summary | null>(null);
  const [receivables, setReceivables] = useState<Summary | null>(null);
  const [operations, setOperations] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      endpoints.reports.agreementSummary(),
      endpoints.reports.receivables(),
      endpoints.reports.workOrders(),
    ])
      .then(([a, r, o]) => {
        setAgreement(a as Summary);
        setReceivables(r as Summary);
        setOperations(o as Summary);
      })
      .catch((c) =>
        setError(c instanceof Error ? c.message : "Unable to load reports"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function download(name: string, getter: () => Promise<Blob>) {
    try {
      const blob = await getter();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (c) {
      setError(c instanceof Error ? c.message : "Export failed");
    }
  }

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
        eyebrow="Reporting"
        title="Reports"
        description="Operational summaries and safe CSV exports from the same tenant-scoped backend."
        actions={
          <div className="export-actions">
            <Button
              className="btn-secondary"
              onClick={() =>
                void download("customers.csv", endpoints.exports.customers)
              }
            >
              Customers CSV
            </Button>
            <Button
              className="btn-secondary"
              onClick={() =>
                void download("agreements.csv", endpoints.exports.agreements)
              }
            >
              Agreements CSV
            </Button>
            <Button
              className="btn-secondary"
              onClick={() =>
                void download("invoices.csv", endpoints.exports.invoices)
              }
            >
              Invoices CSV
            </Button>
          </div>
        }
      />
      {error && <div className="error-banner page-error">{error}</div>}

      <div className="report-grid">
        <MetricCard
          label="Active agreements"
          value={agreement?.active_count}
          note={
            "Expiring within 30 days: " +
            String(agreement?.expiring_count ?? 0)
          }
        />
        <MetricCard
          label="Outstanding"
          value={money(
            receivables?.outstanding,
            String(receivables?.currency || "USD"),
          )}
          note={
            "Overdue: " +
            money(
              receivables?.overdue_amount,
              String(receivables?.currency || "USD"),
            )
          }
        />
        <MetricCard
          label="Open work orders"
          value={String(Number(operations?.overdue_open_count ?? 0))}
          note="Overdue open jobs"
        />
        <MetricCard
          label="Draft invoices"
          value={String(Number(receivables?.draft_invoice_count ?? 0))}
          note={
            money(
              receivables?.draft_amount,
              String(receivables?.currency || "USD"),
            ) + " draft value"
          }
        />
      </div>

      <div className="split-grid">
        <Card>
          <span className="eyebrow">Agreement portfolio</span>
          <h3>Contract health</h3>
          <div className="report-list">
            <div>
              <span>Active</span>
              <strong>{String(agreement?.active_count ?? 0)}</strong>
            </div>
            <div>
              <span>Future accepted</span>
              <strong>{String(agreement?.accepted_future_count ?? 0)}</strong>
            </div>
            <div>
              <span>Expiring</span>
              <strong>{String(agreement?.expiring_count ?? 0)}</strong>
            </div>
            <div>
              <span>Cancelled</span>
              <strong>{String(agreement?.cancelled_count ?? 0)}</strong>
            </div>
          </div>
        </Card>

        <Card>
          <span className="eyebrow">Receivables</span>
          <h3>Cash position</h3>
          <div className="report-list">
            <div>
              <span>Invoiced</span>
              <strong>
                {money(
                  receivables?.total_invoiced,
                  String(receivables?.currency || "USD"),
                )}
              </strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>
                {money(
                  receivables?.total_paid,
                  String(receivables?.currency || "USD"),
                )}
              </strong>
            </div>
            <div>
              <span>Outstanding</span>
              <strong>
                {money(
                  receivables?.outstanding,
                  String(receivables?.currency || "USD"),
                )}
              </strong>
            </div>
            <div>
              <span>Overdue invoices</span>
              <strong>{String(receivables?.overdue_invoice_count ?? 0)}</strong>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-title-row">
          <div>
            <span className="eyebrow">Field operations</span>
            <h3>Technician workload</h3>
          </div>
          <Button
            className="btn-secondary"
            onClick={() =>
              void download("work-orders.csv", endpoints.exports.workOrders)
            }
          >
            Work orders CSV
          </Button>
        </div>
        {Array.isArray(operations?.technicians) && operations!.technicians.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Assigned</th>
                  <th>Open</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {(operations.technicians as Array<Record<string, unknown>>).map(
                  (item) => (
                    <tr key={String(item.user_id)}>
                      <td>
                        <strong>{String(item.full_name)}</strong>
                      </td>
                      <td>{String(item.assigned_count)}</td>
                      <td>{String(item.open_count)}</td>
                      <td>{String(item.completed_count)}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No technician workload"
            description="Active technicians will appear here after work is assigned."
          />
        )}
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: unknown;
  note: string;
}) {
  return (
    <Card className="stat-card">
      <span className="eyebrow">{label}</span>
      <strong className="stat-value">{String(value ?? 0)}</strong>
      <span className="muted">{note}</span>
    </Card>
  );
}

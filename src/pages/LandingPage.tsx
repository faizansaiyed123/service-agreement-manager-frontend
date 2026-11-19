import { Link } from "react-router-dom";
import { publicRegistrationEnabled } from "../lib/features";

const capabilities = [
  {
    number: "01",
    title: "Customers and service locations",
    description:
      "Keep customer details, contacts, billing contacts and the places where service is delivered together.",
  },
  {
    number: "02",
    title: "Agreements and renewals",
    description:
      "Set service scope, pricing and billing frequency, then manage proposal, acceptance and renewal details.",
  },
  {
    number: "03",
    title: "Work orders and technicians",
    description:
      "Schedule work, assign technicians and keep findings and completion notes with each job.",
  },
  {
    number: "04",
    title: "Equipment and maintenance",
    description:
      "Track customer equipment at each service location and turn maintenance plans into planned work.",
  },
  {
    number: "05",
    title: "Invoices and payments",
    description:
      "Issue invoices, follow balances, record payments and retain refund or credit adjustments.",
  },
  {
    number: "06",
    title: "Reports and integrations",
    description:
      "Review operational and financial activity, export CSV reports and manage webhook endpoints.",
  },
];

const serviceSteps = [
  {
    number: "01",
    label: "BUILD THE CONTEXT",
    title: "Start with the customer",
    description:
      "Bring together contacts, service locations and the equipment that needs attention.",
  },
  {
    number: "02",
    label: "DEFINE THE PROMISE",
    title: "Set out the agreement",
    description:
      "Record the scope, price, billing frequency, service dates and renewal terms.",
  },
  {
    number: "03",
    label: "DELIVER THE SERVICE",
    title: "Coordinate and record the work",
    description:
      "Create work orders, assign technicians and keep the visit outcome on record.",
  },
  {
    number: "04",
    label: "CLOSE THE LOOP",
    title: "Invoice and follow through",
    description:
      "Issue invoices, record payments and see what remains outstanding.",
  },
];

const serviceStages = [
  {
    number: "01",
    label: "THE RELATIONSHIP",
    title: "Customer and site",
    description: "People, contacts, service locations and equipment",
  },
  {
    number: "02",
    label: "THE COMMITMENT",
    title: "Service agreement",
    description: "Scope, pricing, billing cadence and renewal terms",
  },
  {
    number: "03",
    label: "THE DELIVERY",
    title: "Work order",
    description: "Scheduled visits, technician assignments and outcomes",
  },
  {
    number: "04",
    label: "THE ACCOUNT",
    title: "Invoice and payment",
    description: "Issued bills, recorded payments and remaining balances",
  },
];

export function LandingPage() {
  const workspacePath = publicRegistrationEnabled ? "/register" : "/login";
  const workspaceAction = publicRegistrationEnabled
    ? "Create your workspace"
    : "Sign in to your workspace";

  return (
    <div className="service-home">
      <header className="service-home-header">
        <div className="service-home-header-inner">
          <Link
            className="service-home-brand"
            to="/"
            aria-label="Service Agreement Manager home"
          >
            <span className="service-home-brand-mark" aria-hidden="true">
              SA
            </span>
            <span className="service-home-brand-copy">
              <strong>Service Agreement</strong>
              <small>MANAGER</small>
            </span>
          </Link>

          <nav className="service-home-nav" aria-label="Page sections">
            <a href="#platform">What it connects</a>
            <a href="#workflow">How work moves</a>
            <a href="#security">Security</a>
          </nav>

          <div className="service-home-header-actions">
            <Link className="service-home-quiet-link" to="/customer-portal/login">
              Customer portal
            </Link>
            <Link className="service-home-quiet-link service-home-staff-link" to="/login">
              Staff sign in
            </Link>
            <Link className="service-home-header-cta" to={workspacePath}>
              {publicRegistrationEnabled ? "Create workspace" : "Workspace sign in"}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="service-home-intro" aria-labelledby="service-home-title">
          <div className="service-home-intro-copy">
            <p className="service-home-kicker">
              SERVICE AGREEMENTS <span aria-hidden="true">/</span> SERVICE DELIVERY <span aria-hidden="true">/</span> BILLING
            </p>
            <h1 id="service-home-title">
              The agreement is the start. <em>Keep the whole relationship in view.</em>
            </h1>
            <p className="service-home-lede">
              Service Agreement Manager brings customer records, service locations,
              agreements, equipment, technician work and billing into one connected
              workspace — so the commitment, the work and the account stay in context.
            </p>

            <div className="service-home-intro-actions">
              <Link className="service-home-primary" to={workspacePath}>
                {workspaceAction}
                <span aria-hidden="true">↗</span>
              </Link>
              <a className="service-home-text-link" href="#workflow">
                See how the work moves
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <p className="service-home-audience">
              Built for service teams managing recurring work across customers and sites.
            </p>
          </div>

          <aside
            className="service-home-journey"
            aria-label="The connected service relationship"
          >
            <div className="service-home-journey-heading">
              <span>ONE CONNECTED SERVICE RELATIONSHIP</span>
              <span>01 — 04</span>
            </div>
            <ol className="service-home-journey-list">
              {serviceStages.map((stage) => (
                <li key={stage.number}>
                  <span className="service-home-journey-number">{stage.number}</span>
                  <div className="service-home-journey-copy">
                    <span className="service-home-journey-label">{stage.label}</span>
                    <h2>{stage.title}</h2>
                    <p>{stage.description}</p>
                  </div>
                  <span className="service-home-journey-arrow" aria-hidden="true">
                    ↗
                  </span>
                </li>
              ))}
            </ol>
            <p className="service-home-journey-note">
              Each stage adds to the service history instead of starting a separate
              record of the relationship.
            </p>
          </aside>
        </section>

        <section className="service-home-capabilities" id="platform">
          <div className="service-home-section-heading">
            <span className="service-home-section-index">THE WORKSPACE</span>
            <h2>
              The parts of service work belong <em>together.</em>
            </h2>
            <p>
              The commercial agreement, the people doing the work and the money
              changing hands are part of the same customer relationship. The
              workspace keeps those responsibilities connected.
            </p>
          </div>

          <ol className="service-home-capability-list">
            {capabilities.map((item) => (
              <li key={item.number}>
                <span className="service-home-capability-number">{item.number}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="service-home-workflow" id="workflow">
          <div className="service-home-workflow-inner">
            <div className="service-home-workflow-heading">
              <span className="service-home-section-index">HOW THE WORK MOVES</span>
              <h2>
                From a clear promise to <em>work you can account for.</em>
              </h2>
              <p>
                A practical sequence for recurring service: establish the customer
                context, agree the work, record what happened and follow the billing
                through.
              </p>
            </div>

            <ol className="service-home-steps">
              {serviceSteps.map((step) => (
                <li key={step.number}>
                  <span className="service-home-step-number">{step.number}</span>
                  <span className="service-home-step-label">{step.label}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="service-home-security" id="security">
          <div className="service-home-security-heading">
            <span className="service-home-section-index">ACCESS AND ACCOUNTABILITY</span>
            <h2>
              The way in matters <em>as much as the work.</em>
            </h2>
            <p>
              Workspace access is checked by the application, with sessions and
              role-specific routes handled as part of the existing sign-in flow.
            </p>
          </div>

          <dl className="service-home-security-list">
            <div>
              <dt>SESSION HANDLING</dt>
              <dd>
                Server-set HttpOnly cookies keep session credentials out of
                browser-readable storage.
              </dd>
            </div>
            <div>
              <dt>SESSION CONTINUITY</dt>
              <dd>
                API requests use the session cookie, with refresh handled through
                the authentication service.
              </dd>
            </div>
            <div>
              <dt>WORKSPACE ACCESS</dt>
              <dd>
                Protected routes verify the session and apply the access rules
                associated with each workspace role.
              </dd>
            </div>
          </dl>
        </section>

        <section className="service-home-close">
          <div>
            <span className="service-home-section-index">SERVICE AGREEMENT MANAGER</span>
            <h2>Keep the agreement, the visit and the invoice in view.</h2>
            <p>
              Give the people managing service work one place to follow the
              relationship from the first commitment through delivery and payment.
            </p>
          </div>
          <Link className="service-home-close-cta" to={workspacePath}>
            {workspaceAction}
            <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>

      <footer className="service-home-footer">
        <Link
          className="service-home-brand"
          to="/"
          aria-label="Service Agreement Manager home"
        >
          <span className="service-home-brand-mark" aria-hidden="true">
            SA
          </span>
          <span className="service-home-brand-copy">
            <strong>Service Agreement</strong>
            <small>MANAGER</small>
          </span>
        </Link>
        <p>One connected workspace for the service relationship, from agreement to invoice.</p>
        <nav aria-label="Account links">
          <Link to="/login">Staff sign in</Link>
          <Link to="/customer-portal/login">Customer portal</Link>
          {publicRegistrationEnabled && <Link to="/register">Create workspace</Link>}
        </nav>
        <span className="service-home-copyright">
          © {new Date().getFullYear()} Service Agreement Manager
        </span>
      </footer>
    </div>
  );
}

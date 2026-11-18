import { Link } from "react-router-dom";
import { publicRegistrationEnabled } from "../lib/features";

const capabilities = [
  {
    number: "01",
    title: "Customers and service sites",
    description:
      "Keep people, locations, equipment and the work history attached to the right customer.",
  },
  {
    number: "02",
    title: "Agreements and renewals",
    description:
      "Set service terms, pricing and billing cadence, then keep acceptance and renewal dates visible.",
  },
  {
    number: "03",
    title: "Work orders and technicians",
    description:
      "Turn agreed work into scheduled visits, assigned jobs and recorded service outcomes.",
  },
  {
    number: "04",
    title: "Equipment and maintenance",
    description:
      "Connect assets and maintenance plans to the places and agreements they support.",
  },
  {
    number: "05",
    title: "Invoices and payments",
    description:
      "Issue invoices, record payments, apply credits or refunds, and follow outstanding balances.",
  },
  {
    number: "06",
    title: "Reports and communication",
    description:
      "Review operational activity, export the information you need and manage customer messages.",
  },
];

const serviceSteps = [
  {
    number: "01",
    label: "UNDERSTAND",
    title: "Set up the customer",
    description:
      "Bring together the people, service locations, equipment and context your team needs.",
  },
  {
    number: "02",
    label: "AGREE",
    title: "Define the service",
    description:
      "Record the scope, price, billing schedule and renewal expectations before work begins.",
  },
  {
    number: "03",
    label: "DELIVER",
    title: "Do and document the work",
    description:
      "Schedule visits, coordinate technicians and save each outcome against the agreement.",
  },
  {
    number: "04",
    label: "CLOSE THE LOOP",
    title: "Bill and follow through",
    description:
      "Issue invoices, record payments and see what is paid, due or still outstanding.",
  },
];

const exampleEvents = [
  {
    number: "01",
    type: "AGREEMENT",
    title: "Annual maintenance plan",
    detail: "Service scope and renewal details",
    status: "ACTIVE",
    state: "active",
  },
  {
    number: "02",
    type: "WORK ORDER",
    title: "Quarterly system inspection",
    detail: "Technician notes and visit outcome",
    status: "RECORDED",
    state: "recorded",
  },
  {
    number: "03",
    type: "INVOICE",
    title: "Service invoice #2048",
    detail: "Payment status and balance due",
    status: "OPEN",
    state: "open",
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
            <div className="service-home-kicker">
              <span aria-hidden="true" />
              FOR TEAMS THAT KEEP PLACES RUNNING
            </div>
            <h1 id="service-home-title">
              Keep every service promise connected to <em>the work.</em>
            </h1>
            <p className="service-home-lede">
              Service Agreement Manager brings customer records, agreements,
              technician work and billing into one shared workflow — so your
              team can see what was agreed, what happened and what still needs
              attention.
            </p>

            <div className="service-home-intro-actions">
              <Link className="service-home-primary" to={workspacePath}>
                {workspaceAction}
                <span aria-hidden="true">↗</span>
              </Link>
              <a className="service-home-text-link" href="#workflow">
                Follow the service cycle
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <p className="service-home-audience">
              Built for recurring service work, from the first customer
              conversation to the final payment.
            </p>
          </div>

          <aside
            className="service-home-record-wrap"
            aria-label="Illustrative customer service record"
          >
            <div className="service-home-record">
              <div className="service-home-record-top">
                <span>EXAMPLE CUSTOMER FILE <b> / 01</b></span>
                <span className="service-home-record-sample">ILLUSTRATIVE</span>
              </div>

              <div className="service-home-record-customer">
                <div>
                  <span className="service-home-field-label">CUSTOMER</span>
                  <h2>Northstar Facilities</h2>
                  <p>Commercial property services</p>
                </div>
                <span className="service-home-file-mark" aria-hidden="true">
                  NF
                </span>
              </div>

              <dl className="service-home-record-details">
                <div>
                  <dt>SERVICE SITE</dt>
                  <dd>Building 04 · North Campus</dd>
                </div>
                <div>
                  <dt>AGREEMENT</dt>
                  <dd>Preventive HVAC care</dd>
                </div>
              </dl>

              <div className="service-home-record-history">
                <div className="service-home-record-history-heading">
                  <span>THE SERVICE HISTORY</span>
                  <span>ONE CONNECTED RECORD</span>
                </div>
                <ol>
                  {exampleEvents.map((event) => (
                    <li className="service-home-record-event" key={event.number}>
                      <span className="service-home-event-number">
                        {event.number}
                      </span>
                      <div className="service-home-event-copy">
                        <span className="service-home-event-type">
                          {event.type}
                        </span>
                        <strong>{event.title}</strong>
                        <small>{event.detail}</small>
                      </div>
                      <span
                        className={`service-home-event-status service-home-event-status-${event.state}`}
                      >
                        {event.status}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="service-home-record-foot">
                <span>Customer → Agreement → Work → Invoice</span>
                <span>CONNECTED CONTEXT</span>
              </div>
            </div>
            <p className="service-home-record-caption">
              An illustrative record — not live customer data.
            </p>
          </aside>
        </section>

        <section className="service-home-capabilities" id="platform">
          <div className="service-home-section-heading">
            <span className="service-home-section-index">01 / THE WHOLE RELATIONSHIP</span>
            <div>
              <h2>
                One customer record.
                <br />
                <em>The full service relationship.</em>
              </h2>
              <p>
                The details people need are often spread across teams. Keep the
                commercial agreement, the service activity and the money due
                within the same customer context.
              </p>
            </div>
          </div>

          <ol className="service-home-capability-list">
            {capabilities.map((item) => (
              <li key={item.number}>
                <span className="service-home-capability-number">{item.number}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <span className="service-home-capability-arrow" aria-hidden="true">
                  ↗
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="service-home-workflow" id="workflow">
          <div className="service-home-workflow-inner">
            <div className="service-home-workflow-heading">
              <span className="service-home-section-index">
                02 / HOW THE WORK MOVES
              </span>
              <h2>
                A service cycle your whole team can <em>follow.</em>
              </h2>
              <p>
                Each step leaves useful context for the next person — from
                whoever agrees the work to whoever delivers it and collects
                payment.
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
            <span className="service-home-section-index">03 / TRUST BY DESIGN</span>
            <h2>
              Good records need <em>careful boundaries.</em>
            </h2>
            <p>
              Security is part of how the workspace handles everyday requests
              and customer information.
            </p>
          </div>

          <div className="service-home-security-list">
            <div>
              <span>01</span>
              <p>
                <strong>HttpOnly session cookies</strong>
                <small>
                  Session credentials are not kept in JavaScript-readable
                  browser storage.
                </small>
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Origin-aware write checks</strong>
                <small>
                  Browser write requests are checked against trusted origins.
                </small>
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Company-scoped records</strong>
                <small>
                  Workspace business records stay within the authenticated
                  company context.
                </small>
              </p>
            </div>
          </div>
        </section>

        <section className="service-home-close">
          <div>
            <span className="service-home-section-index">A CLEARER WAY TO RUN SERVICE WORK</span>
            <h2>Keep the agreement, the visit and the invoice in view.</h2>
            <p>
              Start with your customers. Build a service history your team can
              rely on as the work moves forward.
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
        <p>One record for the service relationship, from agreement to invoice.</p>
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

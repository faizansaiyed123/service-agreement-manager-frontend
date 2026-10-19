import { Link } from "react-router-dom";

const capabilities = [
  {
    number: "01",
    title: "Customer context",
    description: "Keep company records, contacts, service locations and equipment connected to the work that happens there.",
    icon: "◎",
  },
  {
    number: "02",
    title: "Agreement lifecycle",
    description: "Create contract drafts, capture acceptance, manage renewals and keep a clear record of changes.",
    icon: "↗",
  },
  {
    number: "03",
    title: "Field operations",
    description: "Coordinate work orders, maintenance schedules, technicians and service outcomes from one place.",
    icon: "⌁",
  },
  {
    number: "04",
    title: "Billing that follows the work",
    description: "Issue invoices, record payments, apply credits and refunds, and understand outstanding balances.",
    icon: "▤",
  },
  {
    number: "05",
    title: "Operational visibility",
    description: "Review agreement summaries, work-order activity and receivables, then export the data you need.",
    icon: "◫",
  },
  {
    number: "06",
    title: "Connected systems",
    description: "Manage email and SMS delivery queues and publish events through signed webhook endpoints.",
    icon: "⌘",
  },
];

const workflow = [
  ["01", "Set up the customer", "Add contacts, service sites, equipment and the details your team needs."],
  ["02", "Define the agreement", "Create service terms, pricing, billing cadence and renewal expectations."],
  ["03", "Deliver the service", "Schedule and manage work, record outcomes and keep the service history together."],
  ["04", "Close the loop", "Invoice the work, track collections and review business performance."],
];

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Service Agreement Manager home">
          <span className="landing-brand-mark">SA</span>
          <span className="landing-brand-copy">
            <strong>Service Agreement</strong>
            <small>MANAGER</small>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#workflow">How it works</a>
          <a href="#security">Security</a>
        </nav>
        <div className="landing-header-actions">
          <Link className="landing-signin" to="/login">Sign in</Link>
          <Link className="landing-cta landing-cta-small" to="/register">
            Create workspace <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-kicker"><span /> BUILT FOR SERVICE BUSINESSES</div>
            <h1>Keep every agreement and every service <em>in sync.</em></h1>
            <p className="landing-hero-description">
              From the first customer conversation to the final invoice, bring contracts,
              field operations and billing into one clear workspace.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-cta" to="/register">Create your workspace <span aria-hidden="true">↗</span></Link>
              <a className="landing-secondary-link" href="#platform">Explore the platform <span aria-hidden="true">↓</span></a>
            </div>
            <div className="landing-trust-points">
              <span><b aria-hidden="true">✓</b> Connected business records</span>
              <span><b aria-hidden="true">✓</b> Clear service and billing history</span>
            </div>
          </div>

          <div className="landing-visual-wrap" aria-label="Illustrative product interface preview">
            <div className="landing-visual-orbit landing-visual-orbit-one" />
            <div className="landing-visual-orbit landing-visual-orbit-two" />
            <div className="landing-preview">
              <div className="landing-preview-top">
                <div className="landing-preview-brand"><span className="landing-preview-dot" /><strong>Service workspace</strong></div>
                <span className="landing-preview-tag">UI PREVIEW</span>
              </div>
              <div className="landing-preview-content">
                <div className="landing-preview-heading">
                  <div><span>WORKSPACE OVERVIEW</span><h2>Your operations, at a glance.</h2></div>
                  <span className="landing-date-chip">Today</span>
                </div>
                <div className="landing-preview-stats">
                  <div className="landing-preview-stat"><span>Agreements</span><strong>Lifecycle</strong><small><i className="preview-dot preview-dot-green" />Draft to renewal</small></div>
                  <div className="landing-preview-stat"><span>Field work</span><strong>Work orders</strong><small><i className="preview-dot preview-dot-blue" />Schedule to close</small></div>
                  <div className="landing-preview-stat"><span>Billing</span><strong>Receivables</strong><small><i className="preview-dot preview-dot-amber" />Paid and outstanding</small></div>
                </div>
                <div className="landing-preview-lower">
                  <div className="landing-preview-activity">
                    <div className="landing-preview-section-heading"><strong>Agreement activity</strong><span>Illustrative</span></div>
                    <div className="landing-activity-row"><span className="landing-activity-icon">↗</span><span><strong>Preventive maintenance</strong><small>Agreement lifecycle</small></span><b>Active</b></div>
                    <div className="landing-activity-row"><span className="landing-activity-icon landing-activity-icon-amber">◷</span><span><strong>Annual service renewal</strong><small>Renewal workflow</small></span><b className="landing-status-review">Review</b></div>
                    <div className="landing-activity-row"><span className="landing-activity-icon landing-activity-icon-blue">▤</span><span><strong>Customer invoice</strong><small>Payment tracking</small></span><b>Open</b></div>
                  </div>
                  <div className="landing-preview-rail">
                    <div className="landing-rail-icon">✳</div>
                    <strong>One connected record</strong>
                    <p>Customer, agreement, service and billing context in one workflow.</p>
                    <a href="#workflow" aria-label="Learn how the workflow connects">See the workflow <span aria-hidden="true">→</span></a>
                  </div>
                </div>
              </div>
            </div>
            <div className="landing-float-note"><span className="landing-float-check">✓</span><span><strong>From service to invoice</strong><small>A workflow your team can follow</small></span></div>
          </div>
          <div className="landing-hero-footnote">A clearer operating picture for recurring service work.</div>
        </section>

        <section className="landing-platform-section" id="platform">
          <div className="landing-section-intro">
            <div className="landing-kicker"><span /> THE PLATFORM</div>
            <h2>Less chasing information.<br /><em>More running the business.</em></h2>
            <p>Use purpose-built tools that share the same customer and service context instead of maintaining disconnected records.</p>
          </div>
          <div className="landing-capability-grid">
            {capabilities.map(item => (
              <article className="landing-capability" key={item.number}>
                <div className="landing-capability-top"><span className="landing-capability-icon">{item.icon}</span><span>{item.number}</span></div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="landing-card-rule" />
              </article>
            ))}
          </div>
        </section>

        <section className="landing-workflow-section" id="workflow">
          <div className="landing-workflow-heading">
            <div className="landing-kicker"><span /> A CONNECTED SERVICE CYCLE</div>
            <h2>From agreement to <em>accountability.</em></h2>
            <p>Each step builds on the last, keeping the commercial promise connected to the work delivered.</p>
          </div>
          <div className="landing-workflow-grid">
            {workflow.map(([number, title, description]) => (
              <article className="landing-workflow-step" key={number}>
                <span className="landing-step-number">{number}</span>
                <div className="landing-step-line" />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-security-section" id="security">
          <div className="landing-security-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none"><path d="M32 5 52 13v15c0 13.5-8.6 23.1-20 30C20.6 51.1 12 41.5 12 28V13L32 5Z" stroke="currentColor" strokeWidth="2.4"/><path d="m23 31 6 6 13-14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="landing-security-copy">
            <div className="landing-kicker"><span /> BUILT WITH CARE</div>
            <h2>Security belongs in the workflow, <em>not as an afterthought.</em></h2>
            <p>The application uses server-managed HttpOnly session cookies, origin checks for browser write requests, and company-scoped business records.</p>
          </div>
          <div className="landing-security-list">
            <div><span>✓</span><p><strong>HttpOnly session cookies</strong><small>Session tokens stay out of JavaScript-readable storage.</small></p></div>
            <div><span>✓</span><p><strong>Origin-aware request checks</strong><small>Browser write requests are checked against trusted origins.</small></p></div>
            <div><span>✓</span><p><strong>Company-scoped records</strong><small>Workspace data is scoped to the authenticated company.</small></p></div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div><span className="landing-cta-eyebrow">READY FOR A CLEARER WORKFLOW?</span><h2>Bring the service lifecycle together.</h2><p>Start with your customers and build a more connected service operation from there.</p></div>
          <Link className="landing-cta landing-cta-light" to="/register">Create your workspace <span aria-hidden="true">↗</span></Link>
        </section>
      </main>

      <footer className="landing-footer">
        <Link className="landing-brand" to="/" aria-label="Service Agreement Manager home">
          <span className="landing-brand-mark">SA</span>
          <span className="landing-brand-copy"><strong>Service Agreement</strong><small>MANAGER</small></span>
        </Link>
        <p>One workspace for the service relationship, from agreement to invoice.</p>
        <div><Link to="/login">Sign in</Link><Link to="/register">Create workspace</Link><span>© {new Date().getFullYear()} Service Agreement Manager</span></div>
      </footer>
    </div>
  );
}

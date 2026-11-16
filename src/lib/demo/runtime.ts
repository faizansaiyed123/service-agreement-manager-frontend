import type {
  Agreement, Branch, Company, Contact, Customer, Equipment, Invoice,
  ServiceCatalogItem, ServiceLocation, User, WorkOrder, RenewalOffer,
} from "../types";

type AnyRecord = Record<string, any>;

const now = new Date();
const iso = (days = 0) => new Date(now.getTime() + days * 86400000).toISOString();
const date = (days = 0) => iso(days).slice(0, 10);
const id = (prefix: string, n: number) => `demo-${prefix}-${n}`;

const user: User = {
  id: id("user", 1), company_id: id("company", 1), email: "demo@northstarhvac.example",
  full_name: "Alex Morgan", role: "owner", is_active: true,
};
const company: Company = {
  id: id("company", 1), name: "Northstar HVAC Services", legal_name: "Northstar HVAC Services LLC",
  timezone: "America/Chicago", currency: "USD", is_active: true,
};

const customers: Customer[] = [
  { id:id("customer",1), company_id:company.id, customer_number:"CUS-1001", kind:"commercial", name:"Harborview Medical Center", email:"facilities@harborview.example", phone:"(312) 555-0148", status:"active", notes:"Priority facilities account.", created_at:iso(-120), updated_at:iso(-2) },
  { id:id("customer",2), company_id:company.id, customer_number:"CUS-1002", kind:"commercial", name:"Lakefront Office Group", email:"ops@lakefront.example", phone:"(312) 555-0182", status:"active", notes:"Three managed office locations.", created_at:iso(-95), updated_at:iso(-5) },
  { id:id("customer",3), company_id:company.id, customer_number:"CUS-1003", kind:"residential", name:"Maya Patel Residence", email:"maya.patel@example", phone:"(773) 555-0109", status:"active", notes:"Annual maintenance customer.", created_at:iso(-70), updated_at:iso(-7) },
  { id:id("customer",4), company_id:company.id, customer_number:"CUS-1004", kind:"commercial", name:"Riverside Manufacturing", email:"maintenance@riverside.example", phone:"(847) 555-0194", status:"active", notes:"Plant HVAC and refrigeration.", created_at:iso(-45), updated_at:iso(-1) },
  { id:id("customer",5), company_id:company.id, customer_number:"CUS-1005", kind:"commercial", name:"Greenline Retail", email:"stores@greenline.example", phone:"(630) 555-0132", status:"inactive", notes:"Paused account.", created_at:iso(-180), updated_at:iso(-30) },
];

const locations: ServiceLocation[] = [
  { id:id("location",1), customer_id:customers[0].id, name:"Main Hospital", address_line1:"500 Harbor Drive", address_line2:"Facilities entrance", city:"Chicago", region:"IL", postal_code:"60611", country_code:"US", access_instructions:"Check in with facilities desk.", is_active:true },
  { id:id("location",2), customer_id:customers[1].id, name:"Tower A", address_line1:"220 Lake Street", address_line2:null, city:"Chicago", region:"IL", postal_code:"60601", country_code:"US", access_instructions:"Loading dock after 6 PM.", is_active:true },
  { id:id("location",3), customer_id:customers[2].id, name:"Residence", address_line1:"1840 Maple Avenue", address_line2:null, city:"Evanston", region:"IL", postal_code:"60201", country_code:"US", access_instructions:"Gate code provided on arrival.", is_active:true },
  { id:id("location",4), customer_id:customers[3].id, name:"Plant 1", address_line1:"710 Industrial Way", address_line2:"Building 2", city:"Schaumburg", region:"IL", postal_code:"60173", country_code:"US", access_instructions:"PPE required.", is_active:true },
];

const contacts: Contact[] = [
  { id:id("contact",1), customer_id:customers[0].id, full_name:"Jordan Lee", email:"jordan.lee@harborview.example", phone:"(312) 555-0150", is_billing_contact:true },
  { id:id("contact",2), customer_id:customers[1].id, full_name:"Sam Rivera", email:"sam.rivera@lakefront.example", phone:"(312) 555-0184", is_billing_contact:true },
  { id:id("contact",3), customer_id:customers[3].id, full_name:"Priya Shah", email:"priya.shah@riverside.example", phone:"(847) 555-0198", is_billing_contact:true },
];

const catalog: ServiceCatalogItem[] = [
  { id:id("service",1), company_id:company.id, service_code:"PM-HVAC", name:"Preventive HVAC Maintenance", category:"Maintenance", description:"Quarterly inspection, filter check and performance test.", unit_price:"425.00", duration_minutes:120, is_active:true, created_at:iso(-100), updated_at:iso(-4) },
  { id:id("service",2), company_id:company.id, service_code:"DIAG-01", name:"Diagnostic Visit", category:"Repair", description:"On-site diagnostic and system assessment.", unit_price:"185.00", duration_minutes:90, is_active:true, created_at:iso(-100), updated_at:iso(-4) },
  { id:id("service",3), company_id:company.id, service_code:"FILTER-XL", name:"Commercial Filter Set", category:"Parts", description:"High-efficiency commercial filter replacement.", unit_price:"96.00", duration_minutes:20, is_active:true, created_at:iso(-90), updated_at:iso(-3) },
  { id:id("service",4), company_id:company.id, service_code:"EMERGENCY", name:"Emergency Callout", category:"Emergency", description:"Priority after-hours response.", unit_price:"650.00", duration_minutes:120, is_active:true, created_at:iso(-80), updated_at:iso(-2) },
];

const agreements: Agreement[] = [
  {
    id:id("agreement",1), company_id:company.id, customer_id:customers[0].id, service_location_id:locations[0].id,
    agreement_number:"AGR-2026-001", title:"Harborview Comprehensive HVAC Care", status:"active",
    start_date:date(-35), end_date:date(330), billing_frequency:"quarterly", currency:"USD", auto_renew:true,
    renewal_notice_days:60, terms_text:"Quarterly preventive maintenance, priority response and documented service history.",
    total_amount:"5100.00", accepted_by_name:"Jordan Lee", accepted_at:iso(-30), acceptance_method:"portal",
    acceptance_reference:"DEMO-ACCEPT-001", cancelled_at:null, cancellation_reason:null, rejected_at:null,
    rejected_by_name:null, rejection_reason:null, version_number:2, created_at:iso(-40), updated_at:iso(-30),
    lines:[{id:id("aline",1),catalog_item_id:catalog[0].id,service_code:"PM-HVAC",name:"Preventive HVAC Maintenance",description:"Quarterly service",quantity:"12",unit_price:"425.00",line_total:"5100.00"}],
  },
  {
    id:id("agreement",2), company_id:company.id, customer_id:customers[1].id, service_location_id:locations[1].id,
    agreement_number:"AGR-2026-002", title:"Lakefront Office Service Plan", status:"proposed",
    start_date:date(12), end_date:date(377), billing_frequency:"monthly", currency:"USD", auto_renew:true,
    renewal_notice_days:45, terms_text:"Monthly inspection and priority service for office HVAC equipment.",
    total_amount:"3600.00", accepted_by_name:null, accepted_at:null, acceptance_method:null, acceptance_reference:null,
    cancelled_at:null, cancellation_reason:null, rejected_at:null, rejected_by_name:null, rejection_reason:null,
    version_number:1, created_at:iso(-12), updated_at:iso(-1),
    lines:[{id:id("aline",2),catalog_item_id:catalog[0].id,service_code:"PM-HVAC",name:"Preventive HVAC Maintenance",description:"Monthly service",quantity:"8",unit_price:"450.00",line_total:"3600.00"}],
  },
  {
    id:id("agreement",3), company_id:company.id, customer_id:customers[3].id, service_location_id:locations[3].id,
    agreement_number:"AGR-2026-003", title:"Riverside Plant Reliability", status:"active",
    start_date:date(-90), end_date:date(274), billing_frequency:"quarterly", currency:"USD", auto_renew:false,
    renewal_notice_days:60, terms_text:"Plant HVAC reliability program with preventive maintenance and emergency response.",
    total_amount:"7200.00", accepted_by_name:"Priya Shah", accepted_at:iso(-84), acceptance_method:"manual",
    acceptance_reference:"PO-8841", cancelled_at:null, cancellation_reason:null, rejected_at:null,
    rejected_by_name:null, rejection_reason:null, version_number:1, created_at:iso(-95), updated_at:iso(-84),
    lines:[{id:id("aline",3),catalog_item_id:catalog[0].id,service_code:"PM-HVAC",name:"Preventive HVAC Maintenance",description:"Plant service",quantity:"12",unit_price:"600.00",line_total:"7200.00"}],
  },
];

const workOrders: WorkOrder[] = [
  { id:id("work",1), company_id:company.id, branch_id:id("branch",1), customer_id:customers[0].id, service_location_id:locations[0].id, customer_name:customers[0].name, customer_phone:customers[0].phone, service_location_name:locations[0].name, service_location_address:locations[0].address_line1, access_instructions:locations[0].access_instructions, equipment_id:id("equipment",1), agreement_id:agreements[0].id, maintenance_schedule_id:null, occurrence_date:date(2), work_order_number:"WO-2026-1041", title:"Quarterly rooftop inspection", description:"Inspect three rooftop units and document readings.", required_skill:"HVAC", status:"assigned", priority:"high", scheduled_for:iso(2), appointment_start:iso(2), appointment_end:iso(2.1), assigned_to_user_id:id("tech",1), assigned_at:iso(-1), started_at:null, completed_at:null, completion_notes:null, technician_findings:null, checklist_results:null, customer_signoff_name:null, cancellation_reason:null, created_at:iso(-2), updated_at:iso(-1) },
  { id:id("work",2), company_id:company.id, branch_id:id("branch",1), customer_id:customers[1].id, service_location_id:locations[1].id, customer_name:customers[1].name, customer_phone:customers[1].phone, service_location_name:locations[1].name, service_location_address:locations[1].address_line1, access_instructions:locations[1].access_instructions, equipment_id:id("equipment",2), agreement_id:agreements[1].id, maintenance_schedule_id:null, occurrence_date:date(1), work_order_number:"WO-2026-1042", title:"Office air-flow diagnostic", description:"Investigate inconsistent airflow on floor 7.", required_skill:"Diagnostics", status:"in_progress", priority:"normal", scheduled_for:iso(1), appointment_start:iso(1), appointment_end:iso(1.08), assigned_to_user_id:id("tech",2), assigned_at:iso(-2), started_at:iso(0), completed_at:null, completion_notes:null, technician_findings:"Damper actuator under inspection.", checklist_results:{"safety":true,"filters":true,"controls":false}, customer_signoff_name:null, cancellation_reason:null, created_at:iso(-3), updated_at:iso(0) },
  { id:id("work",3), company_id:company.id, branch_id:id("branch",1), customer_id:customers[3].id, service_location_id:locations[3].id, customer_name:customers[3].name, customer_phone:customers[3].phone, service_location_name:locations[3].name, service_location_address:locations[3].address_line1, access_instructions:locations[3].access_instructions, equipment_id:id("equipment",3), agreement_id:agreements[2].id, maintenance_schedule_id:null, occurrence_date:date(-1), work_order_number:"WO-2026-1038", title:"Plant preventive maintenance", description:"Quarterly PM completed.", required_skill:"HVAC", status:"completed", priority:"normal", scheduled_for:iso(-1), appointment_start:iso(-1), appointment_end:iso(-0.9), assigned_to_user_id:id("tech",1), assigned_at:iso(-4), started_at:iso(-1), completed_at:iso(-1), completion_notes:"All readings within expected range.", technician_findings:"Minor belt wear noted.", checklist_results:{"safety":true,"filters":true,"controls":true}, customer_signoff_name:"Priya Shah", cancellation_reason:null, created_at:iso(-7), updated_at:iso(-1) },
  { id:id("work",4), company_id:company.id, branch_id:id("branch",1), customer_id:customers[2].id, service_location_id:locations[2].id, customer_name:customers[2].name, customer_phone:customers[2].phone, service_location_name:locations[2].name, service_location_address:locations[2].address_line1, access_instructions:locations[2].access_instructions, equipment_id:id("equipment",4), agreement_id:null, maintenance_schedule_id:null, occurrence_date:date(4), work_order_number:"WO-2026-1043", title:"Annual tune-up", description:"Residential annual tune-up.", required_skill:"HVAC", status:"scheduled", priority:"low", scheduled_for:iso(4), appointment_start:null, appointment_end:null, assigned_to_user_id:null, assigned_at:null, started_at:null, completed_at:null, completion_notes:null, technician_findings:null, checklist_results:null, customer_signoff_name:null, cancellation_reason:null, created_at:iso(-1), updated_at:iso(-1) },
];

const invoices: Invoice[] = [
  { id:id("invoice",1), company_id:company.id, customer_id:customers[0].id, service_location_id:locations[0].id, agreement_id:agreements[0].id, invoice_number:"INV-2026-0201", status:"issued", invoice_date:date(-8), due_date:date(22), currency:"USD", subtotal:"1275.00", total_amount:"1275.00", discount_percent:"0", discount_amount:"0", tax_percent:"0", tax_amount:"0", notes:"Quarterly service plan billing.", issued_at:iso(-8), voided_at:null, void_reason:null, created_at:iso(-9), updated_at:iso(-8), lines:[{id:id("iline",1),service_code:"PM-HVAC",description:"Preventive HVAC Maintenance",details:"Q2 service",quantity:"3",unit_price:"425.00",line_total:"1275.00"}], amount_paid:"0", amount_refunded:"0", credits_applied:"0", balance_due:"1275.00", is_overdue:false },
  { id:id("invoice",2), company_id:company.id, customer_id:customers[1].id, service_location_id:locations[1].id, agreement_id:agreements[1].id, invoice_number:"INV-2026-0196", status:"partially_paid", invoice_date:date(-25), due_date:date(-2), currency:"USD", subtotal:"900.00", total_amount:"900.00", discount_percent:"0", discount_amount:"0", tax_percent:"0", tax_amount:"0", notes:"Payment received against monthly plan.", issued_at:iso(-25), voided_at:null, void_reason:null, created_at:iso(-26), updated_at:iso(-2), lines:[{id:id("iline",2),service_code:"PM-HVAC",description:"Preventive HVAC Maintenance",details:"Two visits",quantity:"2",unit_price:"450.00",line_total:"900.00"}], amount_paid:"450.00", amount_refunded:"0", credits_applied:"0", balance_due:"450.00", is_overdue:true },
  { id:id("invoice",3), company_id:company.id, customer_id:customers[3].id, service_location_id:locations[3].id, agreement_id:agreements[2].id, invoice_number:"INV-2026-0200", status:"paid", invoice_date:date(-18), due_date:date(12), currency:"USD", subtotal:"600.00", total_amount:"600.00", discount_percent:"0", discount_amount:"0", tax_percent:"0", tax_amount:"0", notes:null, issued_at:iso(-18), voided_at:null, void_reason:null, created_at:iso(-19), updated_at:iso(-10), lines:[{id:id("iline",3),service_code:"PM-HVAC",description:"Plant preventive maintenance",details:null,quantity:"1",unit_price:"600.00",line_total:"600.00"}], amount_paid:"600.00", amount_refunded:"0", credits_applied:"0", balance_due:"0", is_overdue:false },
];

const equipment: Equipment[] = [
  {id:id("equipment",1),company_id:company.id,customer_id:customers[0].id,service_location_id:locations[0].id,asset_number:"AST-1001",category:"Rooftop Unit",manufacturer:"Trane",model_number:"RTU-48",serial_number:"TRN-88421",installed_on:"2023-04-10",warranty_expires_on:"2028-04-10",status:"active",notes:"Unit 1 north wing.",created_at:iso(-100),updated_at:iso(-2)},
  {id:id("equipment",2),company_id:company.id,customer_id:customers[1].id,service_location_id:locations[1].id,asset_number:"AST-1002",category:"Air Handler",manufacturer:"Carrier",model_number:"AHU-20",serial_number:"CAR-55210",installed_on:"2022-08-12",warranty_expires_on:"2027-08-12",status:"active",notes:"Floor 7 mechanical room.",created_at:iso(-90),updated_at:iso(-2)},
  {id:id("equipment",3),company_id:company.id,customer_id:customers[3].id,service_location_id:locations[3].id,asset_number:"AST-1003",category:"Chiller",manufacturer:"York",model_number:"YC-450",serial_number:"YRK-10293",installed_on:"2021-03-02",warranty_expires_on:"2026-03-02",status:"active",notes:"Plant cooling loop.",created_at:iso(-80),updated_at:iso(-1)},
  {id:id("equipment",4),company_id:company.id,customer_id:customers[2].id,service_location_id:locations[2].id,asset_number:"AST-1004",category:"Furnace",manufacturer:"Lennox",model_number:"EL-296",serial_number:"LNX-77319",installed_on:"2024-01-15",warranty_expires_on:"2029-01-15",status:"active",notes:null,created_at:iso(-60),updated_at:iso(-7)},
];

const branches: Branch[] = [{
  id:id("branch",1),company_id:company.id,name:"Chicago Central",code:"CHI",timezone:"America/Chicago",
  address_line1:"100 Service Way",address_line2:null,city:"Chicago",region:"IL",postal_code:"60606",
  country_code:"US",phone:"(312) 555-0100",email:"dispatch@northstar.example",is_primary:true,is_active:true,
  created_at:iso(-120),updated_at:iso(-2)
}];

const renewals: RenewalOffer[] = [{
  id:id("renewal",1),company_id:company.id,source_agreement_id:agreements[0].id,renewed_agreement_id:null,
  offered_by_user_id:user.id,status:"offered",proposed_start_date:date(331),proposed_end_date:date(696),
  expires_on:date(280),snapshot:{title:agreements[0].title,total_amount:"5400.00"},accepted_by_name:null,
  accepted_at:null,acceptance_method:null,acceptance_reference:null,decline_reason:null,created_at:iso(-1),updated_at:iso(-1)
}];

const store = { customers, locations, contacts, catalog, agreements, workOrders, invoices, equipment, branches, renewals };
let sequence = 2000;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function bodyOf(options: RequestInit): AnyRecord {
  if (!options.body || typeof options.body !== "string") return {};
  try { return JSON.parse(options.body); } catch { return {}; }
}
function created<T extends AnyRecord>(item: T): T {
  const value = clone(item);
  if (!value.id) value.id = `demo-generated-${++sequence}`;
  value.company_id ??= company.id;
  value.created_at ??= iso();
  value.updated_at = iso();
  return value;
}
function query(path: string): URLSearchParams {
  const i = path.indexOf("?");
  return new URLSearchParams(i >= 0 ? path.slice(i + 1) : "");
}
function pathOnly(path: string): string { return path.split("?")[0].replace(/^\//, ""); }

function customerFor(idValue: string) { return store.customers.find(x => x.id === idValue) ?? store.customers[0]; }
function locationFor(idValue: string) { return store.locations.find(x => x.id === idValue) ?? store.locations[0]; }

function error(message: string): never { throw new Error(message); }

export async function demoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, 120));
  const method = (options.method || "GET").toUpperCase();
  const p = pathOnly(path);
  const b = bodyOf(options);

  if (p === "auth/login" || p === "auth/register") return clone({ authenticated:true, expires_in:3600 }) as T;
  if (p === "auth/me") return clone(user) as T;
  if (p === "auth/refresh" || p === "auth/logout" || p === "auth/change-password" || p === "auth/verify-email") return undefined as T;
  if (p === "auth/forgot-password") return clone({message:"Demo reset link generated. No email is sent in demo mode."}) as T;
  if (p === "auth/reset-password" || p === "auth/resend-verification") return undefined as T;

  if (p === "companies/current") {
    if (method === "PATCH") Object.assign(company, b);
    return clone(company) as T;
  }

  if (p === "users") {
    if (method === "GET") return clone([user, { ...user, id:id("user",2), full_name:"Morgan Chen", email:"morgan@northstar.example", role:"manager" }]) as T;
    if (method === "POST") return created({ ...b, id:`demo-user-${++sequence}`, is_active:true }) as T;
  }

  if (p.startsWith("users/")) return clone({ ...user, ...b, id:p.split("/")[1] }) as T;

  if (p === "customers") {
    if (method === "GET") return clone(store.customers) as T;
    if (method === "POST") {
      const n = created({ ...b, id:`demo-customer-${++sequence}`, customer_number:`CUS-${sequence}`, status:"active" });
      store.customers.unshift(n); return clone(n) as T;
    }
  }
  if (p.startsWith("customers/")) {
    const parts=p.split("/");
    const customer=customerFor(parts[1]);
    if (parts[2] === "contacts") {
      if (method === "GET") return clone(store.contacts.filter(x=>x.customer_id===customer.id)) as T;
      const n=created({ ...b, id:`demo-contact-${++sequence}`, customer_id:customer.id }); store.contacts.push(n); return clone(n) as T;
    }
    if (parts[2] === "service-locations") {
      if (method === "GET") return clone(store.locations.filter(x=>x.customer_id===customer.id)) as T;
      const n=created({ ...b, id:`demo-location-${++sequence}`, customer_id:customer.id, is_active:true }); store.locations.push(n); return clone(n) as T;
    }
    if (method === "GET") return clone(customer) as T;
    if (method === "PATCH") { Object.assign(customer,b); customer.updated_at=iso(); return clone(customer) as T; }
    if (method === "DELETE") { customer.status="inactive"; customer.updated_at=iso(); return undefined as T; }
  }

  if (p === "equipment") {
    if (method === "GET") return clone(store.equipment) as T;
    const n=created({ ...b, id:`demo-equipment-${++sequence}`, asset_number:`AST-${sequence}`, status:"active" });
    store.equipment.unshift(n); return clone(n) as T;
  }
  if (p.startsWith("equipment/")) {
    const item=store.equipment.find(x=>x.id===p.split("/")[1]); if(!item) error("Equipment not found");
    if(method==="PATCH") Object.assign(item,b);
    return clone(item) as T;
  }

  if (p === "service-catalog") {
    if(method==="GET") return clone(store.catalog) as T;
    const n=created({ ...b, id:`demo-service-${++sequence}`, is_active:true }); store.catalog.unshift(n); return clone(n) as T;
  }
  if (p.startsWith("service-catalog/")) {
    const item=store.catalog.find(x=>x.id===p.split("/")[1]); if(!item) error("Service not found");
    if(method==="PATCH") Object.assign(item,b); return clone(item) as T;
  }

  if (p === "agreements") {
    if(method==="GET") return clone(store.agreements) as T;
    const n=created({ ...b, id:`demo-agreement-${++sequence}`, agreement_number:`AGR-DEMO-${sequence}`, status:"draft", version_number:1, lines:[] }); store.agreements.unshift(n); return clone(n) as T;
  }
  if (p.startsWith("agreements/")) {
    const parts=p.split("/"); const item=store.agreements.find(x=>x.id===parts[1]); if(!item) error("Agreement not found");
    if(parts[2]==="versions") return clone([{version_number:item.version_number,status:item.status,created_at:item.created_at}]) as T;
    if(parts[2]==="events") return clone([{id:id("event",1),event_type:"agreement.updated",created_at:item.updated_at}]) as T;
    if(parts[2]==="renewals") {
      if(method==="GET") return clone(store.renewals.filter(x=>x.source_agreement_id===item.id)) as T;
      const n=created({ ...b,id:`demo-renewal-${++sequence}`,company_id:company.id,source_agreement_id:item.id,status:"offered",proposed_start_date:date(365),proposed_end_date:date(730),expires_on:date(300),snapshot:{title:item.title,total_amount:item.total_amount} }); store.renewals.push(n); return clone(n) as T;
    }
    if(parts[2]) {
      const action=parts[2];
      if(method==="POST") {
        const map: AnyRecord={activate:"active",accept:"accepted",reject:"rejected",cancel:"cancelled",suspend:"suspended",propose:"proposed"};
        if(map[action]) item.status=map[action];
        item.updated_at=iso(); return clone(item) as T;
      }
    }
    if(method==="GET") return clone(item) as T;
    if(method==="PATCH") { Object.assign(item,b); item.updated_at=iso(); return clone(item) as T; }
  }

  if (p === "work-orders") {
    if(method==="GET") return clone(store.workOrders) as T;
    const n=created({ ...b,id:`demo-work-${++sequence}`,work_order_number:`WO-DEMO-${sequence}`,status:"scheduled",priority:b.priority||"normal" }); store.workOrders.unshift(n); return clone(n) as T;
  }
  if(p.startsWith("work-orders/")) {
    const parts=p.split("/"); const item=store.workOrders.find(x=>x.id===parts[1]); if(!item) error("Work order not found");
    if(parts[2]==="events") return clone([{id:id("woevent",1),event_type:"work_order.updated",created_at:item.updated_at}]) as T;
    if(parts[2] && method==="POST") {
      const map:AnyRecord={assign:"assigned",start:"in_progress",complete:"completed",cancel:"cancelled",schedule:"scheduled"};
      if(map[parts[2]]) item.status=map[parts[2]];
      item.updated_at=iso(); return clone(item) as T;
    }
    if(method==="PATCH") Object.assign(item,b);
    return clone(item) as T;
  }

  if (p === "invoices") {
    if(method==="GET") return clone(store.invoices) as T;
    const n=created({ ...b,id:`demo-invoice-${++sequence}`,invoice_number:`INV-DEMO-${sequence}`,status:"draft",currency:"USD",subtotal:b.subtotal||"0",total_amount:b.total_amount||b.subtotal||"0",discount_percent:"0",discount_amount:"0",tax_percent:"0",tax_amount:"0",amount_paid:"0",amount_refunded:"0",credits_applied:"0",balance_due:b.total_amount||b.subtotal||"0",is_overdue:false,lines:[] }); store.invoices.unshift(n); return clone(n) as T;
  }
  if(p.startsWith("invoices/")) {
    const parts=p.split("/"); const item=store.invoices.find(x=>x.id===parts[1]); if(!item) error("Invoice not found");
    if(parts[2]==="payments" && method==="GET") return clone([{id:id("payment",1),invoice_id:item.id,amount:item.amount_paid,payment_method:"bank_transfer",reference:"DEMO-REF",received_at:iso(-3),refunds:[]}]) as T;
    if(parts[2]==="credits" || parts[2]==="events") return clone([]) as T;
    if(parts[2] && method==="POST") {
      const action=parts[2];
      if(action==="issue") { item.status="issued"; item.issued_at=iso(); }
      if(action==="void") { item.status="void"; item.voided_at=iso(); item.void_reason=b.reason||"Demo void"; }
      if(action==="payments") { const amount=Number(b.amount||0); item.amount_paid=String(Number(item.amount_paid)+amount); item.balance_due=String(Math.max(0,Number(item.total_amount)-Number(item.amount_paid))); item.status=Number(item.balance_due)===0?"paid":"partially_paid"; }
      item.updated_at=iso(); return clone(item) as T;
    }
    if(method==="PATCH") Object.assign(item,b);
    return clone(item) as T;
  }

  if(p==="branches") { if(method==="GET") return clone(store.branches) as T; const n=created({...b,id:`demo-branch-${++sequence}`,code:b.code||`BR-${sequence}`,is_primary:false,is_active:true}); store.branches.push(n); return clone(n) as T; }
  if(p.startsWith("branches/")) return clone(store.branches.find(x=>x.id===p.split("/")[1])||store.branches[0]) as T;

  if(p==="maintenance/schedules") return clone([]) as T;
  if(p.startsWith("maintenance/schedules/")) return clone({id:p.split("/")[2]||id("schedule",1),status:"active",name:"Quarterly PM",next_run:date(30)}) as T;

  if(p==="reports/agreements/summary") return clone({active:store.agreements.filter(x=>x.status==="active").length,proposed:store.agreements.filter(x=>x.status==="proposed").length,draft:store.agreements.filter(x=>x.status==="draft").length}) as T;
  if(p==="reports/billing/receivables") return clone({total_outstanding:store.invoices.reduce((s,x)=>s+Number(x.balance_due),0).toFixed(2),overdue:store.invoices.filter(x=>x.is_overdue).reduce((s,x)=>s+Number(x.balance_due),0).toFixed(2),currency:"USD"}) as T;
  if(p==="reports/work-orders") return clone({scheduled:store.workOrders.filter(x=>x.status==="scheduled").length,assigned:store.workOrders.filter(x=>x.status==="assigned").length,in_progress:store.workOrders.filter(x=>x.status==="in_progress").length,completed:store.workOrders.filter(x=>x.status==="completed").length}) as T;

  if(p==="team/technicians") return clone([{id:id("tech",1),email:"jordan.tech@northstar.example",full_name:"Jordan Brooks",is_active:true,skills:["HVAC","Commercial"],branch_ids:[branches[0].id],branch_names:[branches[0].name]},{id:id("tech",2),email:"casey.tech@northstar.example",full_name:"Casey Nguyen",is_active:true,skills:["Diagnostics"],branch_ids:[branches[0].id],branch_names:[branches[0].name]}]) as T;
  if(p==="team/invitations") return clone([]) as T;

  if(p==="notifications" || p==="sms" || p==="webhooks" || p==="recurring-invoices") return clone([]) as T;
  if(p==="customers/imports") return clone([]) as T;
  if(p==="customers/imports/preview" || p.startsWith("customers/imports/")) return clone({status:"demo",rows:[],message:"Import simulation complete"}) as T;

  if(p.startsWith("customer-portal/")) return customerPortal<T>(p, method, b);
  if(p.startsWith("agreement-portal/")) return agreementPortal<T>(p, method, b);
  if(p.startsWith("invoice-portal/")) return invoicePortal<T>(p, method, b);
  if(p.startsWith("attachments")) return clone([]) as T;

  if(p.startsWith("exports/")) {
    const csv = p.includes("customers") ? "customer_number,name,status\nCUS-1001,Harborview Medical Center,active\n" : "id,number,status\ndemo,DEMO,active\n";
    return new Blob([csv], {type:"text/csv"}) as T;
  }
  if(p === "auth/refresh") return undefined as T;

  return clone({}) as T;
}

function customerPortal<T>(p:string, method:string, b:AnyRecord):T {
  if(p==="customer-portal/auth/login" || p==="customer-portal/auth/me") return clone({authenticated:true,expires_in:3600,id:id("portal-user",1),email:"facilities@harborview.example",full_name:"Jordan Lee",memberships:[{membership_id:id("membership",1),customer_id:customers[0].id,company_id:company.id,company_name:company.name,customer_name:customers[0].name}]}) as T;
  if(p==="customer-portal/auth/logout" || p==="customer-portal/auth/refresh") return undefined as T;
  if(p.endsWith("/overview")) return clone({company_name:company.name,customer_name:customers[0].name,customer_number:customers[0].customer_number,customer_kind:customers[0].kind,locations:locations.filter(x=>x.customer_id===customers[0].id),agreement_count:1,open_work_order_count:1,unpaid_invoice_count:1}) as T;
  if(p.endsWith("/agreements")) return clone([agreements[0]]) as T;
  if(p.endsWith("/locations")) return clone(locations.filter(x=>x.customer_id===customers[0].id)) as T;
  if(p.endsWith("/equipment")) return clone(equipment.filter(x=>x.customer_id===customers[0].id)) as T;
  if(p.endsWith("/work-orders")) return clone(workOrders.filter(x=>x.customer_id===customers[0].id)) as T;
  if(p.endsWith("/invoices")) return clone(invoices.filter(x=>x.customer_id===customers[0].id)) as T;
  if(p.includes("/documents")) return clone([]) as T;
  return clone({}) as T;
}
function agreementPortal<T>(p:string, method:string, b:AnyRecord):T {
  const result={agreement_number:agreements[0].agreement_number,title:agreements[0].title,company_name:company.name,customer_name:customers[0].name,recipient_name:"Jordan Lee",recipient_email:"jordan.lee@harborview.example",service_location_name:locations[0].name,service_location_city:locations[0].city,service_location_region:locations[0].region,service_location_country:"US",start_date:agreements[0].start_date,end_date:agreements[0].end_date,billing_frequency:agreements[0].billing_frequency,currency:"USD",auto_renew:true,terms_text:agreements[0].terms_text,total_amount:agreements[0].total_amount,version_number:2,expires_at:iso(7),portal_status:agreements[0].status==="accepted"?"accepted":"pending",accepted_at:agreements[0].accepted_at,rejected_at:null,rejection_reason:null,lines:agreements[0].lines};
  if(p.endsWith("/respond") && method==="POST") { agreements[0].status=b.decision==="reject"?"rejected":"accepted"; return clone({...result,portal_status:agreements[0].status}) as T; }
  return clone(result) as T;
}
function invoicePortal<T>(p:string, method:string, b:AnyRecord):T {
  const invoice=invoices[0];
  if(p.endsWith("/payment-intent")) return clone({payment_intent_id:"pi_demo_123",client_secret:"demo_secret",amount:invoice.balance_due,currency:"USD",test_mode:true}) as T;
  if(p.endsWith("/confirm")) { invoice.status="paid"; invoice.amount_paid=invoice.total_amount; invoice.balance_due="0"; return clone({}) as T; }
  return clone({invoice_number:invoice.invoice_number,company_name:company.name,customer_name:customers[0].name,recipient_name:"Jordan Lee",recipient_email:"jordan.lee@harborview.example",invoice_date:invoice.invoice_date,due_date:invoice.due_date,issued_at:invoice.issued_at,currency:"USD",status:invoice.status,subtotal:invoice.subtotal,discount_amount:invoice.discount_amount,tax_amount:invoice.tax_amount,total_amount:invoice.total_amount,amount_paid:invoice.amount_paid,amount_refunded:"0",credits_applied:"0",balance_due:invoice.balance_due,notes:invoice.notes,expires_at:iso(7),portal_status:invoice.balance_due==="0"?"paid":"payable",lines:invoice.lines}) as T;
}

export async function demoBlob(path:string):Promise<Blob>{
  await new Promise(resolve=>setTimeout(resolve,80));
  if(path.includes(".csv")) return demoRequest<Blob>(path);
  return new Blob(["Service Agreement Manager demo document"],{type:"application/pdf"});
}

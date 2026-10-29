export type Role = "owner" | "admin" | "manager" | "technician" | "billing" | "staff";

export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface Company {
  id: string;
  name: string;
  legal_name: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
}

export interface AuthSession {
  authenticated: true;
  expires_in: number;
}

export interface RegistrationPending {
  message: string;
}

export interface Customer {
  id: string;
  company_id: string;
  customer_number: string;
  kind: "residential" | "commercial";
  name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceLocation {
  id: string;
  customer_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country_code: string;
  access_instructions: string | null;
  is_active: boolean;
}

export interface Contact {
  id: string;
  customer_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_billing_contact: boolean;
}

export interface Equipment {
  id: string;
  company_id: string;
  customer_id: string;
  service_location_id: string;
  asset_number: string;
  category: string;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  installed_on: string | null;
  warranty_expires_on: string | null;
  status: "active" | "inactive" | "decommissioned";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalogItem {
  id: string;
  company_id: string;
  service_code: string;
  name: string;
  category: string;
  description: string | null;
  unit_price: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgreementLine {
  id: string;
  catalog_item_id: string | null;
  service_code: string;
  name: string;
  description: string | null;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export interface Agreement {
  id: string;
  company_id: string;
  customer_id: string;
  service_location_id: string;
  agreement_number: string;
  title: string;
  status:
    | "draft"
    | "proposed"
    | "accepted"
    | "active"
    | "suspended"
    | "cancelled"
    | "expired"
    | "rejected";
  start_date: string;
  end_date: string;
  billing_frequency: string;
  currency: string;
  auto_renew: boolean;
  renewal_notice_days: number;
  terms_text: string;
  total_amount: string;
  accepted_by_name: string | null;
  accepted_at: string | null;
  acceptance_method: string | null;
  acceptance_reference: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  rejected_at: string | null;
  rejected_by_name: string | null;
  rejection_reason: string | null;
  version_number: number;
  created_at: string;
  updated_at: string;
  lines: AgreementLine[];
}

export interface AgreementPortalLine {
  service_code: string;
  name: string;
  description: string | null;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export interface AgreementPortal {
  agreement_number: string;
  title: string;
  company_name: string;
  customer_name: string;
  recipient_name: string;
  recipient_email: string;
  service_location_name: string;
  service_location_city: string;
  service_location_region: string | null;
  service_location_country: string;
  start_date: string;
  end_date: string;
  billing_frequency: string;
  currency: string;
  auto_renew: boolean;
  terms_text: string;
  total_amount: string;
  version_number: number;
  expires_at: string;
  portal_status: "pending" | "accepted" | "rejected" | "unavailable";
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  lines: AgreementPortalLine[];
}

export interface InvoicePortalLine {
  service_code: string;
  description: string;
  details: string | null;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export interface InvoicePortal {
  invoice_number: string;
  company_name: string;
  customer_name: string;
  recipient_name: string;
  recipient_email: string;
  invoice_date: string;
  due_date: string;
  issued_at: string | null;
  currency: string;
  status: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  amount_refunded: string;
  credits_applied: string;
  balance_due: string;
  notes: string | null;
  expires_at: string;
  portal_status: "payable" | "paid";
  lines: InvoicePortalLine[];
}

export interface InvoicePortalPaymentIntent {
  payment_intent_id: string;
  client_secret: string;
  amount: string;
  currency: string;
  test_mode: boolean;
}

export interface WorkOrder {
  id: string;
  company_id: string;
  branch_id: string | null;
  customer_id: string;
  service_location_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  service_location_name?: string | null;
  service_location_address?: string | null;
  access_instructions?: string | null;
  equipment_id: string | null;
  agreement_id: string | null;
  maintenance_schedule_id: string | null;
  occurrence_date: string | null;
  work_order_number: string;
  title: string;
  description: string | null;
  required_skill: string | null;
  status:
    | "scheduled"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled";
  priority: "low" | "normal" | "high" | "emergency";
  scheduled_for: string;
  appointment_start: string | null;
  appointment_end: string | null;
  assigned_to_user_id: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  technician_findings: string | null;
  checklist_results: Record<string, boolean> | null;
  customer_signoff_name: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id: string;
  service_code: string;
  description: string;
  details: string | null;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  service_location_id: string | null;
  agreement_id: string | null;
  invoice_number: string;
  status: "draft" | "issued" | "partially_paid" | "paid" | "void" | "overdue";
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: string;
  total_amount: string;
  discount_percent: string;
  discount_amount: string;
  tax_percent: string;
  tax_amount: string;
  notes: string | null;
  issued_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  lines: InvoiceLine[];
  amount_paid: string;
  amount_refunded: string;
  credits_applied: string;
  balance_due: string;
  is_overdue: boolean;
}

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code: string;
  timezone: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country_code: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RenewalOffer {
  id: string;
  company_id: string;
  source_agreement_id: string;
  renewed_agreement_id: string | null;
  offered_by_user_id: string | null;
  status: "offered" | "accepted" | "declined" | "expired" | "cancelled";
  proposed_start_date: string;
  proposed_end_date: string;
  expires_on: string;
  snapshot: Record<string, unknown>;
  accepted_by_name: string | null;
  accepted_at: string | null;
  acceptance_method: string | null;
  acceptance_reference: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
}


export interface TechnicianInvitation {
  id: string;
  email: string;
  full_name: string;
  branch_ids: string[];
  skills: string[];
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
}

export interface TechnicianProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  skills: string[];
  branch_ids: string[];
  branch_names: string[];
}

export interface CustomerPortalAccess {
  has_access: boolean;
  invited_email: string | null;
  invitation_status: "pending" | "accepted" | "revoked" | "expired" | null;
}

export interface CustomerPortalInvitePreview {
  email: string;
  full_name: string;
  company_name: string;
  customer_name: string;
  expires_at: string;
}

export interface CustomerPortalMembership {
  membership_id: string;
  customer_id: string;
  company_id: string;
  company_name: string;
  customer_name: string;
}

export interface CustomerPortalMe {
  id: string;
  email: string;
  full_name: string;
  memberships: CustomerPortalMembership[];
}

export interface CustomerPortalLocation {
  id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country_code: string;
  is_active: boolean;
}

export interface CustomerPortalOverview {
  company_name: string;
  customer_name: string;
  customer_number: string;
  customer_kind: string;
  locations: CustomerPortalLocation[];
  agreement_count: number;
  open_work_order_count: number;
  unpaid_invoice_count: number;
}

export interface CustomerPortalAgreement {
  id: string;
  agreement_number: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  billing_frequency: string;
  currency: string;
  total_amount: string;
  terms_text: string;
  lines: Array<{
    service_code: string;
    name: string;
    description: string | null;
    quantity: string;
    unit_price: string;
    line_total: string;
  }>;
}

export interface CustomerPortalEquipment {
  id: string;
  asset_number: string;
  service_location_id: string;
  category: string;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  installed_on: string | null;
  warranty_expires_on: string | null;
  status: string;
}

export interface CustomerPortalWorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  status: string;
  priority: string;
  scheduled_for: string;
  appointment_start: string | null;
  appointment_end: string | null;
  service_location_name: string;
  service_location_city: string;
  equipment_label: string | null;
}

export interface CustomerPortalInvoice {
  id: string;
  invoice_number: string;
  status: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  amount_refunded: string;
  credits_applied: string;
  balance_due: string;
  notes: string | null;
  is_overdue: boolean;
  lines: Array<{
    service_code: string;
    description: string;
    details: string | null;
    quantity: string;
    unit_price: string;
    line_total: string;
  }>;
  portal_status: "payable" | "paid";
}

export interface CustomerPortalPaymentIntent {
  payment_intent_id: string;
  client_secret: string;
  amount: string;
  currency: string;
  test_mode: boolean;
}


export interface CustomerPortalPayment { id: string; invoice_id: string; invoice_number: string; amount: string; payment_method: string; reference: string | null; received_at: string; notes: string | null; stripe_status: string | null; refunds: CustomerPortalRefund[]; }
export interface CustomerPortalRefund { id: string; amount: string; refund_method: string; reference: string | null; reason: string; refunded_at: string; }
export interface CustomerPortalDocument { id: string; entity_type: "customer" | "service_location" | "equipment" | "agreement" | "work_order" | "invoice"; entity_id: string; original_filename: string; content_type: string; size_bytes: number; description: string | null; created_at: string; }

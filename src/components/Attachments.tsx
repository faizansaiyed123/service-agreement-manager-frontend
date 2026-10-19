import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import { Button, EmptyState, Input, Modal, TextArea } from "./ui";

export type AttachmentEntity = "customer" | "service_location" | "equipment" | "agreement" | "work_order" | "invoice";
interface Attachment { id: string; original_filename: string; content_type: string; size_bytes: number; description: string | null; created_at: string; }

export function Attachments({ entityType, entityId }: { entityType: AttachmentEntity; entityId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Attachment | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  async function load() {
    try {
      setItems(await endpoints.attachments.list(entityType, entityId) as Attachment[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load attachments");
    }
  }

  useEffect(() => { void load(); }, [entityType, entityId]);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const item = await endpoints.attachments.upload(entityType, entityId, file, description) as Attachment;
      setItems(current => [item, ...current]);
      setDescription("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload attachment");
    } finally {
      setBusy(false);
    }
  }

  async function download(item: Attachment) {
    setError("");
    try {
      const blob = await endpoints.attachments.download(item.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.original_filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to download attachment");
    }
  }

  async function saveDescription(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSavingDescription(true);
    setError("");
    try {
      const updated = await endpoints.attachments.update(editing.id, { description: editDescription.trim() || null }) as Attachment;
      setItems(current => current.map(item => item.id === updated.id ? updated : item));
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update attachment description");
    } finally {
      setSavingDescription(false);
    }
  }

  async function remove(item: Attachment) {
    if (!window.confirm(`Delete "${item.original_filename}"?`)) return;
    setError("");
    try {
      await endpoints.attachments.remove(item.id);
      setItems(current => current.filter(existing => existing.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete attachment");
    }
  }

  return <div className="attachments">
    <div className="attachments-head">
      <div><span className="eyebrow">Documents</span><strong>Attachments</strong></div>
      <label className="btn file-btn">{busy ? "Uploading…" : "Upload file"}<input type="file" disabled={busy} hidden onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /></label>
    </div>
    <Input aria-label="Attachment description" placeholder="Optional description for the next upload" value={description} onChange={event => setDescription(event.target.value)} />
    {error && <div className="error-banner" role="alert">{error}</div>}
    {items.length ? <div className="attachment-list">{items.map(item => <div className="attachment-row" key={item.id}>
      <div><strong>{item.original_filename}</strong><span>{Math.max(1, Math.round(item.size_bytes / 1024))} KB · {item.description || item.content_type}</span></div>
      <div className="row-actions"><button className="text-button" onClick={() => { setEditing(item); setEditDescription(item.description || ""); }}>Edit details</button><Button className="btn-secondary" onClick={() => void download(item)}>Download</Button><button className="text-button danger-text" onClick={() => void remove(item)}>Delete</button></div>
    </div>)}</div> : <EmptyState title="No attachments" description="Upload contracts, photos or supporting documents for this record." />}
    {editing && <Modal title="Edit attachment details" onClose={() => { if (!savingDescription) setEditing(null); }}>
      <form className="form-grid" onSubmit={saveDescription}>
        <div><span className="eyebrow">File</span><strong>{editing.original_filename}</strong></div>
        <label>Description<TextArea value={editDescription} onChange={event => setEditDescription(event.target.value)} maxLength={4000} placeholder="Describe what this document contains" /></label>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <Button disabled={savingDescription}>{savingDescription ? "Saving…" : "Save description"}</Button>
      </form>
    </Modal>}
  </div>;
}

import { useEffect, useState } from "react";
import { endpoints } from "../lib/api";
import { Button, EmptyState, Input } from "./ui";

export type AttachmentEntity = "customer" | "service_location" | "equipment" | "agreement" | "work_order" | "invoice";
interface Attachment { id:string; original_filename:string; content_type:string; size_bytes:number; description:string|null; created_at:string; }

export function Attachments({entityType,entityId}:{entityType:AttachmentEntity;entityId:string}){
  const[items,setItems]=useState<Attachment[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[description,setDescription]=useState("");
  async function load(){try{setItems(await endpoints.attachments.list(entityType,entityId) as Attachment[])}catch(c){setError(c instanceof Error?c.message:"Unable to load attachments")}}
  useEffect(()=>{void load()},[entityType,entityId]);
  async function upload(file:File){
    setBusy(true);setError("");
    try{const item=await endpoints.attachments.upload(entityType,entityId,file,description) as Attachment;setItems(current=>[item,...current]);setDescription("")}catch(c){setError(c instanceof Error?c.message:"Unable to upload attachment")}finally{setBusy(false)}
  }
  async function download(item:Attachment){
    try{const blob=await endpoints.attachments.download(item.id);const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=item.original_filename;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(c){setError(c instanceof Error?c.message:"Unable to download attachment")}
  }
  async function remove(item:Attachment){
    if(!window.confirm("Delete this attachment?"))return;
    try{await endpoints.attachments.remove(item.id);setItems(current=>current.filter(x=>x.id!==item.id))}catch(c){setError(c instanceof Error?c.message:"Unable to delete attachment")}
  }
  return <div className="attachments"><div className="attachments-head"><div><span className="eyebrow">Documents</span><strong>Attachments</strong></div><label className="btn file-btn">{busy?"Uploading…":"Upload file"}<input type="file" disabled={busy} hidden onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.currentTarget.value=""}}/></label></div>
    <Input aria-label="Attachment description" placeholder="Optional description" value={description} onChange={e=>setDescription(e.target.value)}/>
    {error&&<div className="error-banner">{error}</div>}
    {items.length?<div className="attachment-list">{items.map(item=><div className="attachment-row" key={item.id}><div><strong>{item.original_filename}</strong><span>{Math.max(1,Math.round(item.size_bytes/1024))} KB · {item.description||item.content_type}</span></div><div className="row-actions"><Button className="btn-secondary" onClick={()=>void download(item)}>Download</Button><button className="text-button danger-text" onClick={()=>void remove(item)}>Delete</button></div></div>)}</div>:<EmptyState title="No attachments" description="Upload contracts, photos or supporting documents for this record."/>}
  </div>;
}
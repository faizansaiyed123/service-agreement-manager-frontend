import type { ButtonHTMLAttributes, FormEvent, ReactNode } from "react";
import { useState } from "react";

export function Button({ className="", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn ${className}`} {...props}>{children}</button>;
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { const {className="",...rest}=props; return <input className={`input ${className}`} {...rest}/>; }
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { const {className="",...rest}=props; return <textarea className={`input textarea ${className}`} {...rest}/>; }
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { const {className="",...rest}=props; return <select className={`input ${className}`} {...rest}/>; }
export function Card({children,className=""}:{children:ReactNode;className?:string}){return <section className={`card ${className}`}>{children}</section>;}
export function Badge({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"success"|"warning"|"danger"|"info"}){return <span className={`badge badge-${tone}`}>{children}</span>;}
export function Spinner(){return <span className="spinner" aria-label="Loading"/>;}
export function EmptyState({title,description}:{title:string;description:string}){return <div className="empty-state"><strong>{title}</strong><span>{description}</span></div>;}
export function PageHeader({title,eyebrow,description,actions}:{title:string;eyebrow?:string;description?:string;actions?:ReactNode}){return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="page-actions">{actions}</div>}</header>;}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>;}
export function Form({onSubmit,children,busy=false}:{onSubmit:(event:FormEvent<HTMLFormElement>)=>void;children:ReactNode;busy?:boolean}){return <form className="form-grid" onSubmit={onSubmit}>{children}{busy&&<Spinner/>}</form>;}
export function useAsyncAction<T extends unknown[]>(action:(...args:T)=>Promise<unknown>){const[busy,setBusy]=useState(false),[error,setError]=useState("");async function run(...args:T){setBusy(true);setError("");try{return await action(...args);}catch(c){setError(c instanceof Error?c.message:"Something went wrong");return null;}finally{setBusy(false);}}return{busy,error,run,setError};}
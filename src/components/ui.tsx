import type { ButtonHTMLAttributes, ChangeEvent, FormEvent, InputHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, OptionHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Button({ className="", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn ${className}`} {...props}>{children}</button>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { const {className="",...rest}=props; return <input className={`input ${className}`} {...rest}/>; }
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { const {className="",...rest}=props; return <textarea className={`input textarea ${className}`} {...rest}/>; }
type SelectOptionElement = ReactElement<OptionHTMLAttributes<HTMLOptionElement>>;

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const {
    children,
    className = "",
    value,
    defaultValue,
    onChange,
    disabled = false,
    required = false,
    name,
    id,
    title,
    ...triggerProps
  } = props;
  const options = Children.toArray(children).filter(
    (child): child is SelectOptionElement =>
      isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) && child.type === "option",
  );
  const optionValue = (option: SelectOptionElement) => String(option.props.value ?? "");
  const initialOption = options.find(option => option.props.selected) ?? options[0];
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? (initialOption ? optionValue(initialOption) : "")));
  const selectedValue = String(value !== undefined ? value : internalValue);
  const selectedOption = options.find(option => optionValue(option) === selectedValue);
  const selectedIndex = selectedOption ? options.indexOf(selectedOption) : -1;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex));
  const menuId = `select-menu-${useId().replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
    placement: "below" as "above" | "below",
  });
  const buttonProps = triggerProps as unknown as ButtonHTMLAttributes<HTMLButtonElement>;

  function findEnabledIndex(start: number, direction: 1 | -1) {
    if (!options.length) return -1;
    for (let step = 1; step <= options.length; step += 1) {
      const next = (start + direction * step + options.length * 2) % options.length;
      if (!options[next].props.disabled) return next;
    }
    return -1;
  }

  function chooseOption(index: number) {
    const option = options[index];
    if (!option || option.props.disabled || disabled) return;
    const nextValue = optionValue(option);
    if (value === undefined) setInternalValue(nextValue);
    const changeEvent = {
      target: { value: nextValue, name },
      currentTarget: { value: nextValue, name },
    } as unknown as ChangeEvent<HTMLSelectElement>;
    onChange?.(changeEvent);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function toggleMenu() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : findEnabledIndex(-1, 1));
    setOpen(true);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : findEnabledIndex(direction === 1 ? -1 : 0, direction));
        setOpen(true);
      } else {
        setActiveIndex(current => findEnabledIndex(current, direction));
      }
      return;
    }
    if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? findEnabledIndex(-1, 1) : findEnabledIndex(0, -1));
      return;
    }
    if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      chooseOption(activeIndex >= 0 ? activeIndex : selectedIndex);
      return;
    }
    if (open && event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const belowSpace = Math.max(0, window.innerHeight - rect.bottom - 12);
      const aboveSpace = Math.max(0, rect.top - 12);
      const preferredHeight = Math.min(260, options.length * 42 + 12);
      const placement = belowSpace < preferredHeight && aboveSpace > belowSpace ? "above" : "below";
      const availableSpace = placement === "above" ? aboveSpace : belowSpace;
      const maxHeight = Math.max(100, Math.min(260, availableSpace - 8));
      const popupHeight = Math.min(preferredHeight, maxHeight);
      setMenuPosition({
        top: placement === "above" ? Math.max(8, rect.top - popupHeight - 6) : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        width: rect.width,
        maxHeight,
        placement,
      });
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    updatePosition();
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const activeOption = menuRef.current?.querySelector<HTMLElement>(`#${menuId}-option-${activeIndex}`);
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, menuId, open]);

  const menu = open && options.length > 0 ? createPortal(
    <div
      ref={menuRef}
      id={menuId}
      className={`select-menu select-menu-${menuPosition.placement}`}
      role="listbox"
      style={{
        position: "fixed",
        top: menuPosition.top,
        left: menuPosition.left,
        width: menuPosition.width,
        maxHeight: menuPosition.maxHeight,
      }}
    >
      {options.map((option, index) => {
        const isSelected = optionValue(option) === selectedValue;
        return (
          <button
            key={option.key ?? `${optionValue(option)}-${index}`}
            id={`${menuId}-option-${index}`}
            type="button"
            role="option"
            data-value={optionValue(option)}
            aria-selected={isSelected}
            disabled={disabled || !!option.props.disabled}
            className={`select-option${activeIndex === index ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}
            onMouseDown={event => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => chooseOption(index)}
          >
            <span className="select-option-label">{option.props.children}</span>
            {isSelected && <span className="select-option-check" aria-hidden="true">✓</span>}
          </button>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={rootRef} className="select-control">
      <button
        {...buttonProps}
        ref={triggerRef}
        id={id}
        type="button"
        title={title}
        className={`input select-trigger ${className}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-required={required || undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${menuId}-option-${activeIndex}` : undefined}
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        onBlur={event => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null) && !menuRef.current?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
      >
        <span className={`select-trigger-label${selectedOption ? "" : " is-placeholder"}`}>
          {selectedOption?.props.children ?? "Select an option"}
        </span>
      </button>
      <select
        className="select-native"
        name={name}
        value={selectedValue}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={() => undefined}
      >
        {children}
      </select>
      {menu}
    </div>
  );
}
export function Card({children,className=""}:{children:ReactNode;className?:string}){return <section className={`card ${className}`}>{children}</section>;}
export function Badge({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"success"|"warning"|"danger"|"info"}){return <span className={`badge badge-${tone}`}>{children}</span>;}
export function Spinner(){return <span className="spinner" aria-label="Loading"/>;}
export function EmptyState({title,description}:{title:string;description:string}){return <div className="empty-state"><strong>{title}</strong><span>{description}</span></div>;}
export function PageHeader({title,eyebrow,description,actions}:{title:string;eyebrow?:string;description?:string;actions?:ReactNode}){return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="page-actions">{actions}</div>}</header>;}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>;}
export function Form({onSubmit,children,busy=false}:{onSubmit:(event:FormEvent<HTMLFormElement>)=>void;children:ReactNode;busy?:boolean}){return <form className="form-grid" onSubmit={onSubmit}>{children}{busy&&<Spinner/>}</form>;}
export function useAsyncAction<T extends unknown[]>(action:(...args:T)=>Promise<unknown>){const[busy,setBusy]=useState(false),[error,setError]=useState("");async function run(...args:T){setBusy(true);setError("");try{return await action(...args);}catch(c){setError(c instanceof Error?c.message:"Something went wrong");return null;}finally{setBusy(false);}}return{busy,error,run,setError};}
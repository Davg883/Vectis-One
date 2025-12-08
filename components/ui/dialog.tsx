import React, { createContext, useContext, useMemo, useState } from "react";

type DialogContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextType | null>(null);

type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

type DialogTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

export function DialogTrigger({ asChild, children }: DialogTriggerProps) {
  const ctx = useContext(DialogContext);
  if (!ctx) return <>{children}</>;

  const handleClick = (e: React.MouseEvent) => {
    if (React.isValidElement(children)) {
      const childOnClick = (children.props as { onClick?: (e: React.MouseEvent) => void })?.onClick;
      childOnClick?.(e);
    }
    ctx.setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = (children.props as any) || {};
    return React.cloneElement(children, { ...childProps, onClick: handleClick });
  }

  return (
    <button onClick={handleClick} type="button">
      {children}
    </button>
  );
}

type DialogContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function DialogContent({ children, className }: DialogContentProps) {
  const ctx = useContext(DialogContext);
  if (!ctx || !ctx.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className={className}>{children}</div>
    </div>
  );
}

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.94) 100%)" }}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-3 p-4 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-90 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[52%] rounded-xl",
        className
      )}
      style={{
        border: "1px solid rgba(226,18,39,0.18)",
        boxShadow: "0 0 0 1px rgba(226,18,39,0.06), 0 30px 90px rgba(0,0,0,0.85), 0 0 50px rgba(226,18,39,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
        background: "linear-gradient(160deg, rgba(13,13,20,0.98) 0%, rgba(9,9,15,0.99) 100%)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        transformOrigin: "center center",
        maxHeight: "88dvh",
        overflowY: "auto",
        willChange: "transform, opacity",
        animation: "dialog-border-breathe 4s ease-in-out infinite",
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 z-10 flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150"
        style={{ background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.22)", color: "rgba(226,18,39,0.65)", boxShadow: "0 0 8px rgba(226,18,39,0.12)", willChange: "transform" }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background="rgba(226,18,39,0.22)"; el.style.color="#e21227"; el.style.boxShadow="0 0 14px rgba(226,18,39,0.45)"; el.style.transform="scale(1.1)"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background="rgba(226,18,39,0.08)"; el.style.color="rgba(226,18,39,0.65)"; el.style.boxShadow="0 0 8px rgba(226,18,39,0.12)"; el.style.transform="scale(1)"; }}
        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform="scale(0.88)"; }}
        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform="scale(1.1)"; }}
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

/** Positions from the top of the viewport — use for tall modals on mobile */
const DialogContentTop = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{
        position: "fixed",
        top: "6px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        border: "1px solid rgba(226,18,39,0.18)",
        boxShadow: "0 0 0 1px rgba(226,18,39,0.06), 0 30px 90px rgba(0,0,0,0.85), 0 0 50px rgba(226,18,39,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
        background: "linear-gradient(160deg, rgba(13,13,20,0.98) 0%, rgba(9,9,15,0.99) 100%)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        maxHeight: "92dvh",
        overflowY: "auto",
        willChange: "transform, opacity",
        animation: "dialog-border-breathe 4s ease-in-out infinite",
        ...style,
      }}
      className={cn(
        "w-full max-w-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 rounded-xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 z-10 flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150"
        style={{ background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.22)", color: "rgba(226,18,39,0.65)", boxShadow: "0 0 8px rgba(226,18,39,0.12)", willChange: "transform" }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background="rgba(226,18,39,0.22)"; el.style.color="#e21227"; el.style.boxShadow="0 0 14px rgba(226,18,39,0.45)"; el.style.transform="scale(1.1)"; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background="rgba(226,18,39,0.08)"; el.style.color="rgba(226,18,39,0.65)"; el.style.boxShadow="0 0 8px rgba(226,18,39,0.12)"; el.style.transform="scale(1)"; }}
        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform="scale(0.88)"; }}
        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform="scale(1.1)"; }}
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContentTop.displayName = "DialogContentTop"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogContentTop,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

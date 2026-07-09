import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertTriangle, ShieldAlert, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-5 right-4 z-[100] flex max-h-screen w-full max-w-[380px] flex-col gap-2 p-1",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden",
    "rounded-xl border p-4 pr-10",
    "shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.03)]",
    "backdrop-blur-2xl",
    "transition-all duration-300",
    "data-[swipe=cancel]:translate-x-0",
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[swipe=end]:animate-out",
    "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
    "data-[state=open]:slide-in-from-bottom-5",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[rgba(10,10,10,0.96)] border-[rgba(226,18,39,0.25)]",
          "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-gradient-to-b before:from-[#e21227] before:to-[#7a0010] before:rounded-l-xl",
          "[box-shadow:0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(226,18,39,0.06),inset_0_1px_0_rgba(255,255,255,0.04)]",
        ].join(" "),
        destructive: [
          "bg-[rgba(12,3,5,0.97)] border-[rgba(226,18,39,0.45)]",
          "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-gradient-to-b before:from-[#ff2d4e] before:to-[#e21227] before:rounded-l-xl",
          "[box-shadow:0_8px_32px_rgba(0,0,0,0.8),0_0_24px_rgba(226,18,39,0.18),inset_0_1px_0_rgba(255,255,255,0.04)]",
        ].join(" "),
        success: [
          "bg-[rgba(3,10,6,0.97)] border-[rgba(16,185,129,0.3)]",
          "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-gradient-to-b before:from-[#10b981] before:to-[#059669] before:rounded-l-xl",
          "[box-shadow:0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.1),inset_0_1px_0_rgba(255,255,255,0.04)]",
        ].join(" "),
        warning: [
          "bg-[rgba(10,8,2,0.97)] border-[rgba(245,158,11,0.3)]",
          "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-gradient-to-b before:from-[#f59e0b] before:to-[#d97706] before:rounded-l-xl",
          "[box-shadow:0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const VARIANT_ICONS = {
  default: Info,
  destructive: ShieldAlert,
  success: CheckCircle2,
  warning: AlertTriangle,
};

const VARIANT_ICON_COLORS = {
  default: "text-[#e21227]",
  destructive: "text-[#ff2d4e]",
  success: "text-[#10b981]",
  warning: "text-[#f59e0b]",
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  const Icon = VARIANT_ICONS[variant ?? "default"];
  const iconColor = VARIANT_ICON_COLORS[variant ?? "default"];
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        {props.children as React.ReactNode}
      </div>
    </ToastPrimitives.Root>
  );
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-transparent px-3 text-[11px] font-bold font-mono tracking-wide text-foreground/80",
      "transition-all hover:bg-[#1a1a1a] hover:text-foreground hover:border-[#333]",
      "focus:outline-none focus:ring-1 focus:ring-primary/40",
      "disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-lg p-1",
      "text-foreground/30 opacity-0 transition-all duration-200",
      "hover:text-foreground/80 hover:bg-white/5",
      "focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-primary/30",
      "group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3 w-3" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(
      "text-[12px] font-bold font-mono tracking-wide text-foreground uppercase",
      className
    )}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      "text-[12px] leading-relaxed text-foreground/75",
      className
    )}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}

import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full h-full resize-none border-0 outline-0 bg-transparent text-base leading-relaxed",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
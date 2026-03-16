import { Loader2 } from "lucide-react";

interface LoadingModuleProps {
  message?: string;
}

export default function LoadingModule({
  message = "Loading rules..."
}: LoadingModuleProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">

      {/* Spinner */}
      <div className="relative mb-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground tracking-wide">
        {message}
      </p>

      {/* Subtle loading dots */}
      <div className="flex gap-1 mt-3">
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></span>
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></span>
      </div>
    </div>
  );
}
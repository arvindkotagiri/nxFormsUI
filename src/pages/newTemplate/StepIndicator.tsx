import { useWizard } from '@/context/WizardContext';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Streamlined 4-step wizard
const steps = [
  { number: 1, title: 'Upload', description: 'Upload template' },
  { number: 2, title: 'Studio', description: 'Map & Edit Canvas' },
  { number: 3, title: 'Generate', description: 'Create ZPL/HTML' },
  { number: 4, title: 'Save', description: 'Save Label' },
];

interface StepIndicatorProps {
  compact?: boolean;
}

export function StepIndicator({ compact = false }: StepIndicatorProps) {
  // Assuming your setStep type now expects 1-6
  const { currentStep, setStep, uploadedFile, uploadedImage } = useWizard();

  return (
    <nav className={cn("w-full", compact ? "py-0.5" : "py-4")} aria-label="Wizard steps">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isClickable = step.number === 1 || (uploadedFile !== null || uploadedImage !== null);

          return (
            <li key={step.number} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => isClickable && setStep(step.number as any)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-2 group transition-all',
                  isClickable && 'cursor-pointer',
                  !isClickable && 'cursor-not-allowed'
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    compact ? 'w-6 h-6 text-xs border' : 'w-8 h-8 text-sm border-2',
                    'rounded-full flex items-center justify-center font-semibold transition-all',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'bg-primary border-primary text-primary-foreground ring-2 ring-primary/20',
                    !isCompleted && !isCurrent && 'bg-background border-border text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className={cn(compact ? "w-3 h-3" : "w-4 h-4")} /> : step.number}
                </div>

                {/* Step text */}
                <div className="hidden lg:block text-left">
                  <p
                    className={cn(
                      compact ? 'text-[10px]' : 'text-[11px]',
                      'font-bold uppercase tracking-wider transition-colors',
                      isCurrent && 'text-primary',
                      isCompleted && 'text-foreground',
                      !isCompleted && !isCurrent && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </p>
                  {!compact && (
                    <p className="text-[10px] text-muted-foreground hidden xl:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    compact ? 'h-0.5 flex-1 mx-2' : 'h-0.5 flex-1 mx-4',
                    'transition-colors',
                    currentStep > step.number ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
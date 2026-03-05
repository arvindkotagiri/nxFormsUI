import { useWizard } from '@/context/WizardContext';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Redefining the steps to 6 steps
const steps = [
  { number: 1, title: 'Upload', description: 'Upload template' },
  { number: 2, title: 'Identify', description: 'Configure & Map' },
  { number: 3, title: 'Adapt', description: 'Visual Editor' },
  { number: 4, title: 'Generate', description: 'Create ZPL/HTML' },
  { number: 5, title: 'Save', description: 'Save Label' },
];

export function StepIndicator() {
  // Assuming your setStep type now expects 1-6
  const { currentStep, setStep } = useWizard();

  return (
    <nav className="w-full py-4" aria-label="Wizard steps">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isClickable = step.number <= currentStep;

          return (
            <li key={step.number} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => isClickable && setStep(step.number as any)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-3 group transition-all',
                  isClickable && 'cursor-pointer',
                  !isClickable && 'cursor-not-allowed'
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20',
                    !isCompleted && !isCurrent && 'bg-background border-border text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                </div>

                {/* Step text */}
                <div className="hidden lg:block text-left">
                  <p
                    className={cn(
                      'text-[11px] font-bold uppercase tracking-wider transition-colors',
                      isCurrent && 'text-primary',
                      isCompleted && 'text-foreground',
                      !isCompleted && !isCurrent && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground hidden xl:block">
                    {step.description}
                  </p>
                </div>
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-4 transition-colors',
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
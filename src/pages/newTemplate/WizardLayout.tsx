import { useWizard } from '@/context/WizardContext';
import { StepIndicator } from './StepIndicator';
import { TemplateUpload } from './TemplateUpload';
import { TemplateAdapt } from './TemplateAdapt';
import { TemplateGenerate } from './TemplateGenerate';
import { TemplateSave } from './TemplateSave';

export function WizardLayout() {
  const { currentStep } = useWizard();

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <TemplateUpload />;
      case 2: return <TemplateAdapt />;
      case 3: return <TemplateGenerate />;
      case 4: return <TemplateSave />;
      default: return <TemplateUpload />;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Conditionally render header based on step 2 (Studio) for maximum workspace height */}
      {currentStep === 2 ? (
        <div className="flex items-center justify-between gap-4 py-1.5 px-4 card-elevated rounded-2xl">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-sm font-bold text-foreground">
              New Template
            </h1>
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              • Studio
            </span>
          </div>
          <div className="flex-1 max-w-lg md:max-w-xl">
            <StepIndicator compact />
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground">
              New Template
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Create and configure output template
            </p>
          </div>

          {/* Step Indicator */}
          <div className="card-elevated p-4">
            <StepIndicator />
          </div>
        </>
      )}

      {/* Main Step Content */}
      {currentStep === 2 ? (
        <div className="w-full">
          {renderStep()}
        </div>
      ) : (
        <div className="card-elevated p-6 min-h-[600px]">
          {renderStep()}
        </div>
      )}

    </div>
  );
}
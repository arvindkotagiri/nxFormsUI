import { useWizard } from '@/context/WizardContext';
import { StepIndicator } from './StepIndicator';
import { TemplateUpload } from './TemplateUpload';
import { TemplateIdentify } from './TemplateIdentify';
import { TemplateAdapt } from './TemplateAdapt';
import { TemplateGenerate } from './TemplateGenerate';
import { TemplateSave } from './TemplateSave';

export function WizardLayout() {
  const { currentStep } = useWizard();

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <TemplateUpload />;
      case 2: return <TemplateIdentify />;
      case 3: return <TemplateAdapt />;
      case 4: return <TemplateGenerate />;
      case 5: return <TemplateSave />;
      default: return <TemplateUpload />;
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">

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

      {/* Main Step Content */}
      <div className="card-elevated p-6 min-h-[600px]">
        {renderStep()}
      </div>

    </div>
  );
}
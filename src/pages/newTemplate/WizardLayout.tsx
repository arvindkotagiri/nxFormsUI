// import { useWizard } from '@/context/WizardContext';
// import { StepIndicator } from './StepIndicator';
// import { TemplateUpload } from './TemplateUpload';
// import { TemplateIdentify } from './TemplateIdentify';
// import { TemplateAdapt } from './TemplateAdapt';
// import { TemplateGenerate } from './TemplateGenerate';
// import { TemplateSave } from './TemplateSave';
// import { Home, HelpCircle, User, Settings } from 'lucide-react';

// export function WizardLayout() {
//   const { currentStep } = useWizard();

//   const renderStep = () => {
//     switch (currentStep) {
//       case 1: return <TemplateUpload />;
//       case 2: return <TemplateIdentify />;
//       case 3: return <TemplateAdapt />;
//       case 4: return <TemplateGenerate />;
//       case 5: return <TemplateSave />;
//       default: return <TemplateUpload />;
//     }
//   };

//   return (
//     <div className="bg-slate-50 flex-col overflow-hidden">
//       {/* 2. Secondary White Bar (Progress Indicator) */}
//       <nav className="bg-white border-b border-slate-200 h-14 flex items-center px-6 shrink-0 shadow-sm">
//         <div className="w-full max-w-7xl mx-auto">
//           {/* Ensure your StepIndicator doesn't have internal margins that break alignment */}
//           <StepIndicator />
//         </div>
//       </nav>

//       {/* 3. Main Content Area */}
//       {/* Remove overflow-hidden if it's on any parent of 'main' other than the root div */}
//       <main className="flex-1 overflow-y-auto bg-[#f4f7f9]">
//         <div className="max-w-7xl mx-auto p-6 animate-fade-in">
//           <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 min-h-[500px]">
//             {renderStep()}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

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
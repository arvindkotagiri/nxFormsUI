import { WizardProvider } from '@/context/WizardContext';
import { WizardLayout } from './WizardLayout';

const TemplateIndex = () => {
  return (
    <WizardProvider>
      <WizardLayout />
    </WizardProvider>
  );
};

export default TemplateIndex;

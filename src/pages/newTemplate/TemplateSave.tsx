import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Plus, Info } from 'lucide-react';
import { toast } from 'sonner';

const flaskAPI = import.meta.env.VITE_FLASK_API;

export function TemplateSave() {
  const { labelName, setLabelName, selectedContext, selectedSize, chunks, generatedZPL, generatedHTML, generatedXDP, outputMode, watermarkName, printSystemId, reset, prevStep } = useWizard();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedLabelId, setSavedLabelId] = useState('');
  console.log("first", useWizard())
  console.log("second", selectedSize?.id, selectedSize?.name)

  const handleSave = async () => {
    if (!labelName.trim()) {
      toast.error('Please enter a label name');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Prepare Data Payload
      const dynamicFields = chunks.filter(c => !c.isStatic && c.fieldMapping);
      const fieldMapping = dynamicFields.reduce((acc, chunk) => {
        acc[chunk.label] = {
          path: chunk.fieldMapping,
          transformations: chunk.transformations || []
        };
        return acc;
      }, {} as Record<string, any>);

      const barcodeChunk = chunks.find(c => c.type === 'barcode');
      const barcodeType = barcodeChunk?.barcodeType || 'code128';

      const payload = {
        label_id: `LBL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        label_name: labelName,
        context: selectedContext?.name || 'unknown',
        field_mapping: fieldMapping,
        bar_code_type: barcodeType,
        zpl_code: generatedZPL || "",
        html_code: generatedHTML || "",
        xdp_code: generatedXDP || "",
        output_mode: outputMode,
        watermark: watermarkName || null,
        print_system_id: printSystemId,
        page_dimensions: selectedSize?.id || "",
        fields: chunks,
        version: 1.0,
        created_by: "System User" // Default
      };
      setSavedLabelId(payload.label_id);

      // 2. Send to Backend
      // const response = await fetch('http://localhost:5050/save-label', {
      const response = await fetch(`${flaskAPI}/save-label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSaved(true);
        toast.success('Label saved successfully to Database!');
      } else {
        throw new Error(data.error || 'Failed to save label');
      }

    } catch (error) {
      console.error("Save Error:", error);
      toast.error(`Error saving label: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in text-center py-12">
        <div className="w-20 h-20 rounded-full bg-[hsl(145,60%,95%)] flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Label Saved Successfully</h2>
        <p className="text-muted-foreground mb-8">
          Your label "{labelName}" has been saved and is ready for use.
        </p>

        <div className="fiori-section text-left mb-8">
          <div className="fiori-section-header">Label Summary</div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Label ID</span>
              <span className="font-mono text-foreground">{savedLabelId}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Name</span>
              <span className="text-foreground">{labelName}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Context</span>
              <span className="text-foreground">{selectedContext?.name}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Size</span>
              <span className="text-foreground">{selectedSize?.name}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Total Fields</span>
              <span className="text-foreground">{chunks.length}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Version</span>
              <span className="text-foreground">1.0</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <Button onClick={reset} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Create Another Label
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-20">
      {/* Info Message */}
      <div className="fiori-message-strip fiori-message-info mb-6">
        <Info className="w-4 h-4 flex-shrink-0" />
        <span>Give your label a name and save it for reuse and automation.</span>
      </div>

      {/* Label Name Input */}
      <div className="fiori-section mb-6">
        <div className="fiori-section-header">Label Name</div>
        <div className="p-4">
          <div className="fiori-form-group">
            <label className="fiori-form-label">Name *</label>
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="e.g., Standard Shipping Label"
              className="fiori-form-field text-lg"
            />
          </div>
        </div>
      </div>

      {/* Label Configuration */}
      <div className="fiori-section">
        <div className="fiori-section-header">Label Configuration</div>
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm py-2 border-b border-border">
            <span className="text-muted-foreground">Context</span>
            <span className="font-medium text-foreground">{selectedContext?.name || 'Not selected'}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-border">
            <span className="text-muted-foreground">Label Size</span>
            <span className="font-medium text-foreground">{selectedSize?.name || 'Not selected'}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-border">
            <span className="text-muted-foreground">Total Elements</span>
            <span className="font-medium text-foreground">{chunks.length}</span>
          </div>
          <div className="flex justify-between text-sm py-2 border-b border-border">
            <span className="text-muted-foreground">Static Fields</span>
            <span className="font-medium text-foreground">{chunks.filter(c => c.isStatic).length}</span>
          </div>
          <div className="flex justify-between text-sm py-2">
            <span className="text-muted-foreground">Dynamic Fields</span>
            <span className="font-medium text-foreground">{chunks.filter(c => !c.isStatic).length}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 z-40">
        <div className="container flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" /> Start Over
            </Button>
          </div>
          <Button onClick={handleSave} disabled={!labelName.trim() || isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Label
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
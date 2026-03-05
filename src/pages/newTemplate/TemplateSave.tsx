import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, RotateCcw, CheckCircle2, Plus, Info } from 'lucide-react';
import { toast } from 'sonner';

const flaskAPI = import.meta.env.VITE_FLASK_API;

export function TemplateSave() {
  const { labelName, setLabelName, selectedContext, selectedSize, chunks, generatedZPL, generatedHTML, outputMode, reset, prevStep } = useWizard();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  console.log("first", useWizard())
  console.log("second", selectedSize.id, selectedSize.name)

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
        acc[chunk.label] = chunk.fieldMapping;
        return acc;
      }, {} as Record<string, string>);

      const barcodeChunk = chunks.find(c => c.type === 'barcode');
      const barcodeType = barcodeChunk?.barcodeType || 'code128';

      const payload = {
        label_id: `LBL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        label_name: labelName,
        context: selectedContext?.id || 'unknown',
        field_mapping: fieldMapping,
        bar_code_type: barcodeType,
        zpl_code: generatedZPL || "",
        html_code: generatedHTML || "",
        output_mode: outputMode,
        page_dimensions: selectedSize.id || "",
        fields: chunks,
        version: 1.0,
        created_by: "System User" // Default
      };

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
              <span className="font-mono text-foreground">{Math.random().toString(36).substr(2, 8).toUpperCase()}</span>
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


// import { useState } from 'react';
// import { useWizard } from '@/context/WizardContext';
// import { Button } from '@/components/ui/button';
// import {
//     ArrowLeft,
//     Save,
//     RotateCcw,
//     CheckCircle2,
//     Plus,
//     Info
// } from 'lucide-react';
// import { toast } from 'sonner';

// export function TemplateSave() {

//     const {
//         labelName,
//         setLabelName,
//         selectedContext,
//         selectedSize,
//         chunks,
//         generatedZPL,
//         generatedHTML,
//         outputMode,
//         reset,
//         prevStep
//     } = useWizard();

//     const [isSaved, setIsSaved] = useState(false);
//     const [isSaving, setIsSaving] = useState(false);

//     const handleSave = async () => {

//         if (!labelName.trim()) {
//             toast.error("Please enter a label name");
//             return;
//         }

//         if (!selectedContext || !selectedSize) {
//             toast.error("Context and Label size are required");
//             return;
//         }

//         setIsSaving(true);

//         try {

//             /*
//             -------------------------------------------------
//             Prepare Field Mapping
//             -------------------------------------------------
//             */

//             const dynamicFields = chunks.filter(
//                 c => !c.isStatic && c.fieldMapping
//             );

//             const fieldMapping = dynamicFields.reduce((acc, chunk) => {
//                 acc[chunk.label] = chunk.fieldMapping;
//                 return acc;
//             }, {} as Record<string, string>);

//             const barcodeChunk = chunks.find(c => c.type === "barcode");

//             /*
//             -------------------------------------------------
//             Payload
//             -------------------------------------------------
//             */

//             const payload = {
//                 label_id: `LBL-${Date.now()}-${Math.random()
//                     .toString(36)
//                     .substring(2, 8)
//                     .toUpperCase()}`,

//                 label_name: labelName.trim(),

//                 context: selectedContext.id,

//                 field_mapping: fieldMapping,

//                 bar_code_type: barcodeChunk?.barcodeType || "code128",

//                 zpl_code: generatedZPL || "",

//                 html_code: generatedHTML || "",

//                 output_mode: outputMode,

//                 page_dimensions: selectedSize.id,

//                 fields: chunks,

//                 version: 1.0,

//                 created_by: "system_user",

//                 created_on: new Date().toISOString(),

//                 updated_on: new Date().toISOString()
//             };

//             /*
//             -------------------------------------------------
//             Backend Save
//             -------------------------------------------------
//             */

//             const response = await fetch(
//                 "http://localhost:5050/save-label",
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json"
//                     },
//                     body: JSON.stringify(payload)
//                 }
//             );

//             const data = await response.json();

//             if (!response.ok) {
//                 throw new Error(data.error || "Failed to save label");
//             }

//             toast.success("Label saved successfully");

//             setIsSaved(true);

//         } catch (err) {

//             console.error(err);

//             toast.error(
//                 `Save failed: ${
//                     err instanceof Error ? err.message : "Unknown error"
//                 }`
//             );

//         } finally {
//             setIsSaving(false);
//         }
//     };

//     /*
//     ============================================================
//     SUCCESS SCREEN
//     ============================================================
//     */

//     if (isSaved) {
//         return (
//             <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">

//                 <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
//                     <CheckCircle2 className="w-10 h-10 text-green-600" />
//                 </div>

//                 <h2 className="text-2xl font-semibold mb-2">
//                     Label Saved Successfully
//                 </h2>

//                 <p className="text-muted-foreground mb-8">
//                     {labelName} is ready for automation workflows
//                 </p>

//                 <div className="bg-card border rounded-xl p-6 text-left mb-8">
//                     <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider">
//                         Label Summary
//                     </h3>

//                     <div className="space-y-3 text-sm">

//                         <div className="flex justify-between border-b pb-2">
//                             <span className="text-muted-foreground">
//                                 Label Name
//                             </span>
//                             <span>{labelName}</span>
//                         </div>

//                         <div className="flex justify-between border-b pb-2">
//                             <span className="text-muted-foreground">
//                                 Context
//                             </span>
//                             <span>{selectedContext?.name}</span>
//                         </div>

//                         <div className="flex justify-between border-b pb-2">
//                             <span className="text-muted-foreground">
//                                 Size
//                             </span>
//                             <span>{selectedSize?.name}</span>
//                         </div>

//                         <div className="flex justify-between">
//                             <span className="text-muted-foreground">
//                                 Total Fields
//                             </span>
//                             <span>{chunks.length}</span>
//                         </div>

//                     </div>
//                 </div>

//                 <Button onClick={reset} size="lg">
//                     <Plus className="w-4 h-4 mr-2" />
//                     Create New Label
//                 </Button>

//             </div>
//         );
//     }

//     /*
//     ============================================================
//     FORM SCREEN
//     ============================================================
//     */

//     return (
//         <div className="max-w-2xl mx-auto pb-24 animate-fade-in">

//             {/* Info Message */}
//             <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3 text-sm text-blue-700 mb-6">
//                 <Info className="w-4 h-4" />
//                 <span>
//                     Name your label configuration before saving to database
//                 </span>
//             </div>

//             {/* Label Name */}
//             <div className="bg-card border rounded-xl p-5 mb-6">
//                 <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4">
//                     Label Name
//                 </h3>

//                 <input
//                     value={labelName}
//                     onChange={(e) => setLabelName(e.target.value)}
//                     placeholder="Example: Shipping Label A4"
//                     className="w-full p-3 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
//                 />
//             </div>

//             {/* Configuration */}
//             <div className="bg-card border rounded-xl p-5">
//                 <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4">
//                     Configuration
//                 </h3>

//                 <div className="space-y-3 text-sm">

//                     <Row label="Context" value={selectedContext?.name} />
//                     <Row label="Label Size" value={selectedSize?.name} />
//                     <Row label="Total Elements" value={chunks.length} />
//                     <Row
//                         label="Static Fields"
//                         value={chunks.filter(c => c.isStatic).length}
//                     />
//                     <Row
//                         label="Dynamic Fields"
//                         value={chunks.filter(c => !c.isStatic).length}
//                     />

//                 </div>
//             </div>

//             {/* Footer Actions */}
//             <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t p-4 z-50">
//                 <div className="max-w-7xl mx-auto flex justify-between">

//                     <Button variant="outline" onClick={prevStep}>
//                         <ArrowLeft className="w-4 h-4 mr-2" />
//                         Back
//                     </Button>

//                     <Button
//                         onClick={handleSave}
//                         disabled={isSaving}
//                         className="bg-[#1c2b39] text-white px-12"
//                     >
//                         <Save className="w-4 h-4 mr-2" />
//                         {isSaving ? "Saving..." : "Save Label"}
//                     </Button>

//                     <Button variant="outline" onClick={reset}>
//                         <RotateCcw className="w-4 h-4 mr-2" />
//                         Start Over
//                     </Button>

//                 </div>
//             </div>

//         </div>
//     );
// }

// /*
// ----------------------------------------------------
// Reusable Row Component
// ----------------------------------------------------
// */

// function Row({ label, value }: { label: string; value?: string }) {
//     return (
//         <div className="flex justify-between border-b pb-2">
//             <span className="text-muted-foreground">{label}</span>
//             <span className="font-medium">{value || "Not selected"}</span>
//         </div>
//     );
// }
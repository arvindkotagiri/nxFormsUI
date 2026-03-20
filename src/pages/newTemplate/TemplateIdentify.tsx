// import { useState, useEffect } from 'react';
// import { useWizard } from '@/context/WizardContext';
// import { Button } from '@/components/ui/button';
// import {
//   ArrowLeft, ArrowRight, Trash2,
//   Layers, Settings2, MousePointer2, Lock, Zap
// } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { toast } from 'sonner';

// export function TemplateIdentify() {
//   const {
//     uploadedImage,
//     cleanImage, // Use the clean reference image from backend
//     uploadedFile,
//     chunks,
//     removeChunk,
//     updateChunk,
//     nextStep,
//     prevStep,
//     selectedContext
//   } = useWizard();

//   const [selectedChunk, setSelectedChunk] = useState<string | null>(null);

//   // Auto-select first chunk
//   useEffect(() => {
//     if (chunks.length > 0 && !selectedChunk) {
//       setSelectedChunk(chunks[0].id);
//     }
//   }, [chunks, selectedChunk]);

//   const selectedChunkData = chunks.find(c => c.id === selectedChunk);

//   // Decide what image to show:
//   // For PDFs, 'uploadedImage' is a pdf blob, so we MUST use 'cleanImage' (PNG from backend).
//   // For Images, 'uploadedImage' is good, but 'cleanImage' is also fine (it's the same or converted).
//   // We prefer 'cleanImage' if available as it matches the backend's coordinate system exactly.
//   const displayImage = cleanImage || uploadedImage;

//   return (
//     <div className="flex flex-col animate-in fade-in duration-500">

//       {/* 1. Statistics Bar */}
//       <div className="flex items-center justify-end gap-4 mb-6">
//         <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded border border-blue-100">
//           <Lock className="w-3 h-3 text-[#0064d1]" />
//           <span className="text-[10px] font-bold text-[#0064d1] uppercase">{chunks.filter(c => c.isStatic).length} Static Fields</span>
//         </div>
//         <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded border border-red-100">
//           <Zap className="w-3 h-3 text-[#d04343]" />
//           <span className="text-[10px] font-bold text-[#d04343] uppercase">{chunks.filter(c => !c.isStatic).length} Dynamic Fields</span>
//         </div>
//       </div>

//       <div className="flex gap-6 items-start lg:flex-row flex-col">

//         {/* 2. Left Sidebar: Layers */}
//         <div className="w-full lg:w-64 bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm sticky top-0 max-h-[70vh]">
//           <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-t-lg">
//             <span className="flex items-center gap-2 font-bold text-[11px] text-slate-500 uppercase tracking-widest">
//               <Layers className="w-3.5 h-3.5" /> Elements
//             </span>
//           </div>
//           <div className="overflow-y-auto p-2 space-y-1">
//             {chunks.map((chunk) => (
//               <button
//                 key={chunk.id}
//                 onClick={() => setSelectedChunk(chunk.id)}
//                 className={cn(
//                   "w-full flex items-center gap-3 px-3 py-2.5 rounded text-left text-[11px] transition-all border",
//                   selectedChunk === chunk.id
//                     ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm"
//                     : "bg-white border-transparent hover:border-slate-200 text-slate-600"
//                 )}
//               >
//                 {chunk.type === 'table_cell' ? <Layers className="w-3 h-3 text-green-500" /> : (chunk.isStatic ? <Lock className="w-3 h-3 text-blue-500" /> : <Zap className="w-3 h-3 text-red-500" />)}
//                 <span className="truncate flex-1 font-bold uppercase tracking-tight">{chunk.label}</span>
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* 3. Center: Display Area */}
//         <div className="flex-1 relative flex flex-col items-center min-w-0">
//           <div className="relative inline-block bg-white shadow-xl border border-slate-200 rounded-sm overflow-hidden select-none min-h-[600px] w-full flex items-center justify-center">

//             <img
//               src={displayImage || ''}
//               alt="Document Template"
//               className="block pointer-events-none select-none h-auto w-full"
//               style={{ maxWidth: '800px' }}
//             />

//             {/* Field Overlays */}
//             {chunks.map((chunk) => (
//               <div
//                 key={chunk.id}
//                 onClick={(e) => { e.stopPropagation(); setSelectedChunk(chunk.id); }}
//                 className={cn(
//                   'absolute border-2 transition-all z-20 cursor-pointer',
//                   chunk.type === 'table_cell' ? 'border-green-500 bg-green-500/10' : (chunk.isStatic ? 'border-blue-500' : 'border-red-500'),
//                   selectedChunk === chunk.id ? 'ring-4 ring-black/10 z-30 bg-black/5' : 'bg-transparent'
//                 )}
//                 style={{
//                   left: `${chunk.x}%`,
//                   top: `${chunk.y}%`,
//                   width: `${chunk.width}%`,
//                   height: `${chunk.height}%`
//                 }}
//               >
//                 <div className={cn(
//                   "absolute -top-6 left-0 text-white text-[9px] px-1.5 py-0.5 rounded-t font-black whitespace-nowrap uppercase shadow-sm",
//                   chunk.type === 'table_cell' ? "bg-green-500" : (chunk.isStatic ? "bg-blue-500" : "bg-red-500")
//                 )}>
//                   {chunk.label}
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Helper hint for PDFs */}
//           {uploadedFile?.type === 'application/pdf' && (
//             <p className="mt-4 text-[10px] text-slate-400 italic">
//               Viewing Page 1 of PDF. Converted to image for identification.
//             </p>
//           )}
//         </div>

//         {/* 4. Right Sidebar: Properties */}
//         <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm sticky top-0">
//           <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 font-bold text-[11px] text-slate-500 uppercase tracking-widest rounded-t-lg">
//             <Settings2 className="w-3.5 h-3.5" /> Property Editor
//           </div>

//           <div className="p-5">
//             {selectedChunkData ? (
//               <div className="space-y-6">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field Label</label>
//                   <input
//                     type="text"
//                     value={selectedChunkData.label}
//                     onChange={(e) => updateChunk(selectedChunkData.id, { label: e.target.value })}
//                     className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
//                   />
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logic Type</label>
//                   <div className="flex border border-slate-200 rounded p-1 bg-slate-50">
//                     <button
//                       onClick={() => updateChunk(selectedChunkData.id, { isStatic: true })}
//                       className={cn(
//                         "flex-1 py-1.5 text-[10px] font-black rounded transition-all",
//                         selectedChunkData.isStatic ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-slate-400"
//                       )}
//                     >
//                       STATIC
//                     </button>
//                     <button
//                       onClick={() => updateChunk(selectedChunkData.id, { isStatic: false })}
//                       className={cn(
//                         "flex-1 py-1.5 text-[10px] font-black rounded transition-all",
//                         !selectedChunkData.isStatic ? "bg-white text-red-600 shadow-sm" : "bg-transparent text-slate-400"
//                       )}
//                     >
//                       DYNAMIC
//                     </button>
//                   </div>
//                 </div>

//                 <div className="p-4 rounded border border-slate-100 bg-slate-50/30">
//                   {selectedChunkData.isStatic ? (
//                     <div className="space-y-2">
//                       <p className="text-[9px] font-bold text-slate-400 uppercase">Fixed Value</p>
//                       <textarea
//                         value={selectedChunkData.value || ""}
//                         onChange={(e) => updateChunk(selectedChunkData.id, { value: e.target.value })}
//                         placeholder="Enter static text..."
//                         className="w-full h-24 p-2 text-xs border border-slate-200 rounded resize-none focus:ring-1 focus:ring-blue-500 outline-none"
//                       />
//                     </div>
//                   ) : (
//                     <div className="space-y-4">
//                       <div className="text-center py-2 border-b border-slate-200/60 pb-4">
//                         <Zap className="w-5 h-5 text-red-500 mx-auto mb-1" />
//                         <p className="text-[10px] text-red-600 font-bold uppercase transition-colors">Dynamic Data Source</p>
//                       </div>

//                       <div className="space-y-2">
//                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Map to SAP Field</label>
//                         <select
//                           value={selectedChunkData.fieldMapping || ''}
//                           onChange={(e) => updateChunk(selectedChunkData.id, { fieldMapping: e.target.value })}
//                           className="w-full h-9 bg-white border border-slate-200 rounded px-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
//                         >
//                           <option value="">Select a field...</option>
//                           {selectedContext?.fields?.map((field: any) => (
//                             <option key={field.path} value={field.path}>
//                               {field.name}
//                             </option>
//                           ))}
//                         </select>
//                       </div>

//                       {selectedChunkData.type === 'barcode' && (
//                         <div className="space-y-2 pt-2 border-t border-slate-200/60">
//                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Barcode Format</label>
//                           <select
//                             value={selectedChunkData.barcodeType || 'code128'}
//                             onChange={(e) => updateChunk(selectedChunkData.id, { barcodeType: e.target.value as any })}
//                             className="w-full h-9 bg-white border border-slate-200 rounded px-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
//                           >
//                             <option value="code128">Code 128</option>
//                             <option value="code39">Code 39</option>
//                             <option value="itf14">ITF-14</option>
//                             <option value="qr">QR Code</option>
//                           </select>
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 <Button
//                   variant="ghost"
//                   className="w-full text-red-500 hover:text-red-600 font-bold text-[10px] hover:bg-red-50 tracking-widest"
//                   onClick={() => { removeChunk(selectedChunkData.id); setSelectedChunk(null); }}
//                 >
//                   <Trash2 className="w-3.5 h-3.5 mr-2" /> DELETE ELEMENT
//                 </Button>
//               </div>
//             ) : (
//               <div className="py-20 text-center">
//                 <MousePointer2 className="w-6 h-6 text-slate-300 mx-auto mb-2" />
//                 <p className="text-[10px] font-bold text-slate-400 uppercase">Select an element to edit</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* 5. Sticky Action Bar */}
//       <div className="mt-12 py-5 flex items-center justify-between border-t border-slate-200 bg-white/80 backdrop-blur-md sticky bottom-0 z-50">
//         <Button
//           variant="outline"
//           onClick={prevStep}
//           className="text-[10px] font-bold uppercase h-10 px-6 border-slate-300 text-slate-600"
//         >
//           <ArrowLeft className="w-4 h-4 mr-2" /> Back to Upload
//         </Button>
//         <Button
//           onClick={nextStep}
//           className="bg-[#1c2b39] hover:bg-slate-800 px-10 text-[10px] font-bold uppercase h-10 tracking-widest"
//         >
//           Adapt Label <ArrowRight className="w-4 h-4 ml-2" />
//         </Button>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from 'react';
import { useWizard, type Transformation } from '@/context/WizardContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  Layers,
  Settings2,
  MousePointer2,
  Lock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TemplateIdentify() {

  const {
    uploadedImage,
    cleanImage,
    uploadedFile,
    chunks,
    removeChunk,
    updateChunk,
    nextStep,
    prevStep,
    selectedContext
  } = useWizard();

  const [selectedChunk, setSelectedChunk] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({
    width: 0,
    height: 0
  });

  useEffect(() => {
    if (chunks.length > 0 && !selectedChunk) {
      setSelectedChunk(chunks[0].id);
    }
  }, [chunks, selectedChunk]);

  const selectedChunkData = chunks.find(c => c.id === selectedChunk);

  const displayImage = cleanImage || uploadedImage;

  const isDynamic = selectedChunkData && !selectedChunkData.isStatic;
  const hasFieldMapping = !!selectedChunkData?.fieldMapping;

  const canUseTransformations = isDynamic && hasFieldMapping;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header Stats */}
      <div className="flex justify-end gap-3">
        <span className="badge-neutral flex items-center gap-1.5">
          <Lock size={12} />
          {chunks.filter(c => c.isStatic).length} Static
        </span>

        <span className="badge-info flex items-center gap-1.5">
          <Zap size={12} />
          {chunks.filter(c => !c.isStatic).length} Dynamic
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-5">

        {/* LEFT — Field List */}
        <div className="card-elevated flex flex-col">

          <div className="p-3 border-b border-border flex items-center gap-2">
            <Layers size={14} />
            <h3 className="font-display text-xs font-semibold">
              Fields
            </h3>
          </div>

          <div className="p-2 space-y-1 overflow-y-auto max-h-[65vh]">
            {chunks.map(chunk => (
              <button
                key={chunk.id}
                onClick={() => setSelectedChunk(chunk.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-body transition-all border",
                  selectedChunk === chunk.id
                    ? "bg-accent/10 border-accent"
                    : "border-transparent hover:border-border"
                )}
              >
                {chunk.isStatic
                  ? <Lock size={12} className="text-primary" />
                  : <Zap size={12} className="text-destructive" />
                }

                <span className="truncate font-semibold uppercase tracking-tight">
                  {chunk.label}
                </span>
              </button>
            ))}
          </div>

        </div>

        {/* CENTER — Document Preview */}
        <div className="flex flex-col items-center">

          <div
            className="card-elevated relative flex justify-center"
          >

            <img
              src={displayImage || ""}
              alt="Template"
              className="max-w-full h-auto select-none"
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                setImgSize({
                  width: img.clientWidth,
                  height: img.clientHeight
                });
              }}
            />

            {/* Overlay Boxes */}
            {imgSize.width > 0 && chunks.map(chunk => {

              const left = (chunk.x / 100) * imgSize.width;
              const top = (chunk.y / 100) * imgSize.height;
              const width = (chunk.width / 100) * imgSize.width;
              const height = (chunk.height / 100) * imgSize.height;

              return (
                <div
                  key={chunk.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChunk(chunk.id);
                  }}
                  className={cn(
                    "absolute border-2 cursor-pointer transition-all",
                    chunk.isStatic ? "border-primary" : "border-destructive",
                    selectedChunk === chunk.id && "ring-4 ring-accent/20"
                  )}
                  style={{
                    left,
                    top,
                    width,
                    height
                  }}
                />
              );
            })}

          </div>

          {uploadedFile?.type === "application/pdf" && (
            <p className="text-[10px] text-muted-foreground mt-3 italic">
              PDF converted to image for preview
            </p>
          )}

        </div>

        {/* RIGHT — Properties */}
        <div className="card-elevated flex flex-col">

          <div className="p-3 border-b border-border flex items-center gap-2">
            <Settings2 size={14} />
            <h3 className="font-display text-xs font-semibold">
              Property Editor
            </h3>
          </div>

          <div className="p-5 space-y-6">

            {!selectedChunkData && (
              <div className="text-center py-16">
                <MousePointer2 className="mx-auto text-muted-foreground mb-3" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Select field to edit
                </p>
              </div>
            )}

            {selectedChunkData && (
              <>
                {/* Label */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Field Label
                  </label>

                  <input
                    value={selectedChunkData.label}
                    onChange={(e) =>
                      updateChunk(selectedChunkData.id, {
                        label: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm font-semibold bg-card focus:ring-2 focus:ring-accent/30 outline-none"
                  />
                </div>

                {/* Logic Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Logic Type
                  </label>

                  <div className="flex border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        updateChunk(selectedChunkData.id, { isStatic: true })
                      }
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold tracking-wider",
                        selectedChunkData.isStatic
                          ? "bg-background text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      STATIC
                    </button>

                    <button
                      onClick={() =>
                        updateChunk(selectedChunkData.id, { isStatic: false })
                      }
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold tracking-wider",
                        !selectedChunkData.isStatic
                          ? "bg-background text-destructive"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      DYNAMIC
                    </button>
                  </div>
                </div>

                {/* Mapping */}
                {!selectedChunkData.isStatic && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                      SAP Field Mapping
                    </label>

                    <select
                      value={selectedChunkData.fieldMapping || ""}
                      onChange={(e) =>
                        updateChunk(selectedChunkData.id, {
                          fieldMapping: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border text-xs font-semibold bg-card focus:ring-2 focus:ring-accent/30 outline-none"
                    >
                      <option value="">Select field</option>
                      {selectedContext?.fields?.map((field: any) => (
                        <option key={field.path} value={field.path}>
                          {field.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Transformation Library */}
                {isDynamic && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Transformation Library
                      </label>

                      <select
                        disabled={!canUseTransformations}
                        onChange={(e) => {
                          const type = e.target.value as Transformation["type"];
                          if (!type) return;

                          const newTransformation: Transformation = { type };

                          updateChunk(selectedChunkData.id, {
                            transformations: [
                              ...(selectedChunkData.transformations || []),
                              newTransformation,
                            ],
                          });

                          e.target.value = "";
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border text-xs font-semibold bg-card"
                      >
                        <option value="">Add Transformation</option>
                        <option value="to_upper">To Upper</option>
                        <option value="to_lower">To Lower</option>
                        <option value="concatenate">Concatenate</option>
                        <option value="format_date">Format Date</option>
                        <option value="add">Add</option>
                        <option value="multiply">Multiply</option>
                        <option value="if_else">If-Then-Else</option>
                        <option value="default_value">Default Value</option>
                      </select>
                    </div>
                    {selectedChunkData?.transformations?.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                          Applied Transformations
                        </label>

                        {selectedChunkData.transformations.map((t, index) => {
                          const needsValue = !["to_upper", "to_lower"].includes(t.type);

                          return (
                            <div
                              key={index}
                              className="space-y-2 px-3 py-2 border rounded-lg text-xs"
                            >
                              {/* Row Header */}
                              <div className="flex justify-between items-center">
                                <span className="font-semibold">{t.type}</span>

                                <button
                                  onClick={() => {
                                    const updated = selectedChunkData.transformations!.filter(
                                      (_, i) => i !== index
                                    );

                                    updateChunk(selectedChunkData.id, {
                                      transformations: updated
                                    });
                                  }}
                                  className="text-destructive"
                                >
                                  Remove
                                </button>
                              </div>

                              {/* Value Input */}
                              {needsValue && (
                                <input
                                  disabled={!canUseTransformations}
                                  type="text"
                                  placeholder="Enter value..."
                                  value={(t as any).value || ""}
                                  onChange={(e) => {
                                    const updated = [...selectedChunkData.transformations!];

                                    updated[index] = {
                                      ...updated[index],
                                      value: e.target.value
                                    };

                                    updateChunk(selectedChunkData.id, {
                                      transformations: updated
                                    });
                                  }}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                />
                              )}
                              {isDynamic && !hasFieldMapping && (
                                <p className="text-[10px] text-muted-foreground italic">
                                  Select a SAP field to enable transformations
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                {/* Delete */}
                <Button
                  variant="ghost"
                  className="w-full text-destructive text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => {
                    removeChunk(selectedChunkData.id);
                    setSelectedChunk(null);
                  }}
                >
                  <Trash2 size={14} />
                  Delete Field
                </Button>
              </>
            )}

          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center border-t border-border pt-4">

        <Button
          variant="outline"
          onClick={prevStep}
          className="text-xs font-bold uppercase"
        >
          <ArrowLeft size={14} />
          Back
        </Button>

        <Button
          onClick={nextStep}
          className="bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest px-8"
        >
          Continue
          <ArrowRight size={14} />
        </Button>

      </div>

    </div>
  );
}
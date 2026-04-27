// import { useCallback, useState } from 'react';
// import { useDropzone } from 'react-dropzone';
// import { useWizard } from '@/context/WizardContext';
// import { Button } from '@/components/ui/button';
// import {
//   Upload, ArrowRight, Trash2, Loader2,
//   Settings2, ChevronDown, CheckCircle2,
//   FileSearch, Ruler
// } from 'lucide-react';
// import { BUSINESS_CONTEXTS, LABEL_SIZES } from '@/data/labelData';
// import { cn } from '@/lib/utils';

// export function TemplateUpload() {
//   const {
//     uploadedImage, setUploadedImage, uploadedFile, setUploadedFile,
//     setAnalysisResults, nextStep, outputMode, setOutputMode,
//     selectedContext, setSelectedContext, selectedSize, setSelectedSize
//   } = useWizard();

//   const [isProcessing, setIsProcessing] = useState(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   const onDrop = useCallback((acceptedFiles: File[]) => {
//     const file = acceptedFiles[0];
//     if (file) {
//       setErrorMessage(null);
//       setUploadedFile(file);
//       const reader = new FileReader();
//       reader.onload = () => setUploadedImage(reader.result as string);
//       reader.readAsDataURL(file);
//     }
//   }, [setUploadedImage, setUploadedFile]);

//   const handleUploadAndProcess = async () => {
//     if (!uploadedFile) return;
//     setIsProcessing(true);
//     const formData = new FormData();
//     formData.append('image', uploadedFile);
//     try {
//       const response = await fetch('http://localhost:5050/analyze-label', { method: 'POST', body: formData });
//       const data = await response.json();
//       if (data.status === "success") {
//         setAnalysisResults(data.extracted_fields, data.annotated_image, data.clean_image);
//         nextStep();
//       } else { setErrorMessage(data.error || "Analysis failed"); }
//     } catch (err) { setErrorMessage("Connection Error: Check Port 5050."); }
//     finally { setIsProcessing(false); }
//   };

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop,
//     noClick: !!uploadedImage,
//     accept: {
//       'image/png': ['.png'],
//       'image/jpeg': ['.jpg', '.jpeg'],
//       'application/pdf': ['.pdf']
//     },
//     maxFiles: 1,
//   });

//   return (
//     <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-white">

//       <div className="flex flex-1 overflow-hidden">

//         {/* LEFT COLUMN: CONFIGURATION (Sidebar) */}
//         <div className="w-[380px] border-r border-slate-200 flex flex-col p-6 overflow-y-auto bg-slate-50/50">
//           <div className="flex items-center gap-3 mb-10">
//             <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
//               <Settings2 className="w-5 h-5 text-white" />
//             </div>
//             <div>
//               <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Configuration</h2>
//               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Setup Environment</p>
//             </div>
//           </div>

//           <div className="space-y-8">
//             {/* Business Context Dropdown */}
//             <div className="space-y-3">
//               <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
//                 <FileSearch className="w-3.5 h-3.5 text-blue-600" /> Business Context
//               </label>
//               <div className="relative">
//                 <select
//                   value={selectedContext?.id || ""}
//                   onChange={(e) => setSelectedContext(BUSINESS_CONTEXTS.find(c => c.id === e.target.value))}
//                   className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-semibold transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none cursor-pointer"
//                 >
//                   <option value="" disabled>Select Object Context...</option>
//                   {BUSINESS_CONTEXTS.map(ctx => (
//                     <option key={ctx.id} value={ctx.id}>{ctx.name}</option>
//                   ))}
//                 </select>
//                 <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
//               </div>
//             </div>

//             {/* Label Size Dropdown (Updated from buttons) */}
//             <div className="space-y-3">
//               <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
//                 <Ruler className="w-3.5 h-3.5 text-blue-600" /> Page Dimensions
//               </label>
//               <div className="relative">
//                 <select
//                   value={selectedSize?.id || ""}
//                   onChange={(e) => setSelectedSize(LABEL_SIZES.find(s => s.id === e.target.value) || null)}
//                   className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-semibold transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none cursor-pointer"
//                 >
//                   <option value="" disabled>Select Print Size...</option>
//                   {LABEL_SIZES.map(size => (
//                     <option key={size.id} value={size.id}>{size.name}</option>
//                   ))}
//                 </select>
//                 <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
//               </div>
//             </div>

//             {/* Output Format Dropdown */}
//             <div className="space-y-3">
//               <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
//                 <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Output Mode
//               </label>
//               <div className="relative">
//                 <select
//                   value={outputMode}
//                   onChange={(e) => setOutputMode(e.target.value as any)}
//                   className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-semibold transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none cursor-pointer"
//                 >
//                   <option value="zpl">ZPL (Thermal Printing)</option>
//                   <option value="html">HTML/CSS (Web Invoice)</option>
//                   <option value="both">Synchronized (Both)</option>
//                 </select>
//                 <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* RIGHT COLUMN: SCROLLABLE IMAGE PREVIEW */}
//         <div className="flex-1 bg-slate-200/50 relative overflow-auto custom-scrollbar p-12 flex items-start justify-center">
//           <div {...getRootProps()} className={cn(
//             "relative min-h-full w-full flex items-center justify-center",
//             !uploadedImage && "cursor-pointer"
//           )}>
//             <input {...getInputProps()} />

//             {uploadedImage ? (
//               <div className={cn(
//                 "relative group",
//                 uploadedFile?.type === 'application/pdf' ? "w-full max-w-5xl h-full" : "inline-block"
//               )}>
//                 {uploadedFile?.type === 'application/pdf' ? (
//                   <embed
//                     src={uploadedImage}
//                     type="application/pdf"
//                     className="w-full h-[800px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-sm border border-white/50 bg-white"
//                   />
//                 ) : (
//                   <img
//                     src={uploadedImage}
//                     alt="Template Preview"
//                     className="max-w-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-sm border border-white/50 bg-white"
//                     style={{ width: 'auto', height: 'auto' }} // Allows full image to render
//                   />
//                 )}

//                 {/* Floating Clear Button */}
//                 <div className="sticky top-4 float-right ml-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
//                   <Button
//                     variant="destructive"
//                     size="icon"
//                     onClick={(e) => { e.stopPropagation(); setUploadedImage(null); setUploadedFile(null); }}
//                     className="h-12 w-12 shadow-xl rounded-full border-2 border-white hover:scale-110 transition-transform"
//                   >
//                     <Trash2 className="w-6 h-6" />
//                   </Button>
//                 </div>

//                 {isProcessing && (
//                   <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
//                     <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center">
//                       <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
//                       <span className="text-sm font-black text-slate-800 uppercase tracking-widest">AI Extraction Active</span>
//                       <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Mapping OCR Data Points...</p>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             ) : (
//               <div className={cn(
//                 "w-full h-[600px] border-4 border-dashed rounded-[40px] flex flex-col items-center justify-center transition-all bg-white shadow-sm",
//                 isDragActive ? "border-blue-500 bg-blue-50 scale-[0.98]" : "border-slate-200 hover:border-slate-300"
//               )}>
//                 <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 shadow-inner">
//                   <Upload className="w-10 h-10 text-slate-400" />
//                 </div>
//                 <h3 className="text-2xl font-black text-slate-800 tracking-tight">Import Blueprint</h3>
//                 <p className="text-slate-500 mt-2 text-base">Drag & drop your label template here</p>
//                 <Button className="mt-10 bg-blue-600 hover:bg-blue-700 h-12 px-12 rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95">Browse Files</Button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* FOOTER BAR */}
//       <div className="h-20 bg-white border-t border-slate-200 px-10 flex items-center justify-between relative z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
//         <div className="flex gap-12">
//           <div className="flex flex-col">
//             <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Context</span>
//             <span className="text-xs font-black text-slate-600 tracking-tight">{selectedContext?.name || "Pending..."}</span>
//           </div>
//           <div className="flex flex-col border-l border-slate-100 pl-12">
//             <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Format</span>
//             <span className="text-xs font-black text-slate-600 tracking-tight uppercase">{outputMode}</span>
//           </div>
//         </div>

//         <Button
//           disabled={!uploadedImage || !selectedContext || !selectedSize || isProcessing}
//           onClick={handleUploadAndProcess}
//           className="bg-blue-600 hover:bg-blue-700 text-white px-16 h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-4 shadow-xl shadow-blue-100 disabled:opacity-20"
//         >
//           {isProcessing ? "Analyzing" : "Analyze & Continue"} <ArrowRight className="w-5 h-5" />
//         </Button>
//       </div>
//     </div>
//   );
// }

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useWizard } from '@/context/WizardContext';
import { BUSINESS_CONTEXTS, LABEL_SIZES } from '@/data/labelData';
import { Upload, Loader2 } from 'lucide-react';
const flaskAPI = import.meta.env.VITE_FLASK_API;

export function TemplateUpload() {
  const {
    uploadedImage,
    setUploadedImage,
    uploadedFile,
    setUploadedFile,
    setAnalysisResults,
    nextStep,
    outputMode,
    setOutputMode,
    selectedContext,
    setSelectedContext,
    selectedSize,
    setSelectedSize,
    chunks,
    lastAnalyzedFile
  } = useWizard();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contexts, setContexts] = useState<any[]>(BUSINESS_CONTEXTS);

  useEffect(() => {
    const fetchContexts = async () => {
      try {
        const response = await fetch(`${flaskAPI || 'http://localhost:5050'}/api/catalog`);
        const apis = await response.json();
        
        const dynamicContexts = [];
        apis.forEach((api: any) => {
          if (api.entities && Array.isArray(api.entities)) {
            api.entities.forEach((entity: any) => {
              dynamicContexts.push({
                id: `api-${api.id}-${entity.name}`,
                name: `${api.name} - ${entity.name}`,
                entity: entity.name,
                fields: api.fields?.[entity.name] || []
              });
            });
          } else {
            dynamicContexts.push({
              id: `api-${api.id}`,
              name: api.name,
              fields: []
            });
          }
        });
        
        setContexts([...BUSINESS_CONTEXTS, ...dynamicContexts]);
      } catch (err) {
        console.error("Failed to fetch contexts", err);
      }
    };
    fetchContexts();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setErrorMessage(null);
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  }, [setUploadedFile, setUploadedImage]);

  const currentFileSignature = uploadedFile ? `${uploadedFile.name}-${uploadedFile.size}-${uploadedFile.lastModified}` : null;
  const isAlreadyAnalyzed = lastAnalyzedFile === currentFileSignature && chunks.length > 0;

  const handleUploadAndProcess = async () => {
    if (!uploadedFile) {
      console.error("No file uploaded");
      return;
    }

    console.log("Triggering analysis for:", uploadedFile.name);
    setIsProcessing(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('image', uploadedFile);

    const targetUrl = `${flaskAPI || 'http://localhost:5050'}/analyze-label`;
    console.log("Fetching from:", targetUrl);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Analysis data received:", data);

      if (data.status === "success") {
        setAnalysisResults(
          data.extracted_fields,
          data.annotated_image,
          data.clean_image
        );
        nextStep();
      } else {
        setErrorMessage(data.error || "Analysis failed");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMessage("Connection error: backend not reachable.");
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">

      {/* LEFT: Configuration */}
      <div className="card-elevated p-5 space-y-6">

        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">
            Configuration
          </h3>
          <p className="text-xs text-muted-foreground font-body mt-1">
            Define template properties
          </p>
        </div>

        {/* Business Context */}
        <div className="space-y-2">
          <label className="text-xs font-body text-muted-foreground">
            Business Context
          </label>
          <select
            value={selectedContext?.id || ""}
            onChange={(e) =>
              setSelectedContext(
                contexts.find(c => c.id === e.target.value)
              )
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="" disabled>Select context...</option>
            {contexts.map(ctx => (
              <option key={ctx.id} value={ctx.id}>
                {ctx.name}
              </option>
            ))}
          </select>
        </div>

        {/* Page Size */}
        <div className="space-y-2">
          <label className="text-xs font-body text-muted-foreground">
            Page Dimensions
          </label>
          <select
            value={selectedSize?.id || ""}
            onChange={(e) =>
              setSelectedSize(
                LABEL_SIZES.find(s => s.id === e.target.value) || null
              )
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="" disabled>Select size...</option>
            {LABEL_SIZES.map(size => (
              <option key={size.id} value={size.id}>
                {size.name}
              </option>
            ))}
          </select>
        </div>

        {/* Output Mode */}
        <div className="space-y-2">
          <label className="text-xs font-body text-muted-foreground">
            Output Mode
          </label>
          <select
            value={outputMode}
            onChange={(e) => setOutputMode(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="zpl">ZPL</option>
            <option value="html">HTML</option>
            <option value="xdp">XDP</option>
            <option value="all">All (Synchronized)</option>
          </select>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="badge-neutral">
            {selectedContext?.name || "No Context"}
          </span>
          <span className="badge-info">
            {outputMode.toUpperCase()}
          </span>
        </div>

      </div>

      {/* RIGHT: Upload / Preview */}
      <div className="card-elevated p-6 flex flex-col">

        <div
          {...getRootProps()}
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all
          ${isDragActive ? "border-accent bg-accent/5" : "border-border"}`}
        >
          <input {...getInputProps()} />

          {uploadedImage ? (
            uploadedFile?.type === "application/pdf" ? (
              <embed
                src={uploadedImage}
                type="application/pdf"
                className="w-full h-[600px] rounded-md border border-border"
              />
            ) : (
              <img
                src={uploadedImage}
                alt="Preview"
                className="max-h-[600px] object-contain rounded-md border border-border"
              />
            )
          ) : (
            <div className="text-center space-y-3">
              <Upload className="mx-auto text-muted-foreground" size={28} />
              <div className="text-sm font-body text-muted-foreground">
                Drag & drop your template file here
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="text-xs text-destructive mt-3">
            {errorMessage}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            disabled={
              !uploadedImage ||
              !selectedContext ||
              !selectedSize ||
              isProcessing
            }
            onClick={handleUploadAndProcess}
            className="px-6 py-2 rounded-lg text-sm font-semibold font-body transition-all disabled:opacity-40"
            style={{
              background: "hsl(var(--accent))",
              color: "white"
            }}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Analyzing...
              </span>
            ) : isAlreadyAnalyzed ? (
              "Continue"
            ) : (
              "Analyze & Continue"
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
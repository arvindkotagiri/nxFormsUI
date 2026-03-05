import { useEffect, useState, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ArrowRight, Copy, RefreshCw, Check, FileCode,
  ImageIcon, Loader2, FileText, Download, Code2, Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
const flaskAPI = import.meta.env.VITE_FLASK_API;

export function TemplateGenerate() {
  const {
    generatedZPL, setGeneratedZPL,
    generatedHTML, setGeneratedHTML,
    nextStep, prevStep, uploadedFile, outputMode,
    modifiedLabelBlob // Get modified blob
  } = useWizard();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingZPL, setIsLoadingZPL] = useState(false);
  const [isLoadingHTML, setIsLoadingHTML] = useState(false);
  const [copiedZPL, setCopiedZPL] = useState(false);
  const [copiedHTML, setCopiedHTML] = useState(false);

  // --- API Call: ZPL Generation ---
  const generateZPL = useCallback(async () => {
    // If we have a modified blob, wrap it in a File object (or blob is fine for fetch FormData)
    // If not, use uploadedFile
    const fileToSend = modifiedLabelBlob || uploadedFile;

    if (!fileToSend || (outputMode !== 'zpl' && outputMode !== 'both')) return;

    setIsLoadingZPL(true);
    const formData = new FormData();
    formData.append('image', fileToSend);
    try {
      // const res = await fetch('http://localhost:5050/generate-zpl', { method: 'POST', body: formData });
      const res = await fetch(`${flaskAPI}/generate-zpl`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.status === 'success') {
        setGeneratedZPL(data.zpl_code);
        setPreviewImage(data.labelary_preview);
      }
    } catch (e) {
      toast.error("ZPL Generation Failed");
    } finally {
      setIsLoadingZPL(false);
    }
  }, [uploadedFile, modifiedLabelBlob, outputMode, setGeneratedZPL]);

  // --- API Call: HTML Generation ---
  const generateHTML = useCallback(async () => {
    const fileToSend = modifiedLabelBlob || uploadedFile;

    if (!fileToSend || (outputMode !== 'html' && outputMode !== 'both')) return;
    setIsLoadingHTML(true);
    const formData = new FormData();
    formData.append('image', fileToSend);
    try {
      // const res = await fetch('http://localhost:5050/replicate-invoice', { method: 'POST', body: formData });
      const res = await fetch(`${flaskAPI}/replicate-invoice`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.status === 'success') {
        setGeneratedHTML(data.full_html);
      }
    } catch (e) {
      toast.error("HTML Generation Failed");
    } finally {
      setIsLoadingHTML(false);
    }
  }, [uploadedFile, modifiedLabelBlob, outputMode, setGeneratedHTML]);

  // --- Effect: Trigger Generation on Load (with Guardrails) ---
  useEffect(() => {
    if ((outputMode === 'zpl' || outputMode === 'both') && !generatedZPL && !isLoadingZPL) {
      generateZPL();
    }
    if ((outputMode === 'html' || outputMode === 'both') && !generatedHTML && !isLoadingHTML) {
      generateHTML();
    }
  }, [outputMode, generatedZPL, generatedHTML, isLoadingZPL, isLoadingHTML, generateZPL, generateHTML]);

  // --- Actions: Copy & Download ---
  const handleCopyZPL = () => {
    navigator.clipboard.writeText(generatedZPL || "");
    setCopiedZPL(true);
    toast.success("ZPL copied to clipboard");
    setTimeout(() => setCopiedZPL(false), 2000);
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(generatedHTML || "");
    setCopiedHTML(true);
    toast.success("HTML source copied");
    setTimeout(() => setCopiedHTML(false), 2000);
  };

  const downloadHTML = () => {
    if (!generatedHTML) return;
    const blob = new Blob([generatedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-template.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const iframe = document.getElementById('html-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      toast.error("Preview not ready for PDF conversion");
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-32 px-4 space-y-8">

      {/* ZPL SECTION */}
      {(outputMode === 'zpl' || outputMode === 'both') && (
        <div className={cn("grid gap-6", outputMode === 'both' ? "lg:grid-cols-2" : "grid-cols-1 max-w-4xl mx-auto")}>
          <BoxWrapper
            title="ZPL Source"
            icon={<FileCode className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={generateZPL} disabled={isLoadingZPL} className="h-7 text-[10px]">
                  <RefreshCw className={cn("w-3 h-3 mr-1", isLoadingZPL && "animate-spin")} /> REGENERATE
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyZPL} className="h-7 text-[10px]">
                  {copiedZPL ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />} COPY
                </Button>
              </div>
            }
          >
            <div className="relative bg-slate-950 rounded h-[350px] border border-slate-800">
              {isLoadingZPL && <LoadingOverlay />}
              <pre className="p-4 font-mono text-[10px] text-emerald-400 overflow-auto h-full scrollbar-thin scrollbar-thumb-slate-800">
                {generatedZPL || "Initializing ZPL Engine..."}
              </pre>
            </div>
          </BoxWrapper>

          <BoxWrapper title="Thermal Preview" icon={<ImageIcon className="w-4 h-4" />}>
            <div className="bg-slate-200 rounded h-[350px] flex items-center justify-center p-6 relative shadow-inner border border-slate-300">
              {isLoadingZPL && <LoadingOverlay />}
              {previewImage ? (
                <img src={previewImage} className="max-h-full border-4 border-white shadow-2xl" alt="Label Preview" />
              ) : (
                <span className="text-slate-400 text-xs italic font-medium">Awaiting AI Render...</span>
              )}
            </div>
          </BoxWrapper>
        </div>
      )}

      {/* HTML SECTION */}
      {(outputMode === 'html' || outputMode === 'both') && (
        <div className={cn("grid gap-6", outputMode === 'both' ? "lg:grid-cols-2" : "grid-cols-1 max-w-4xl mx-auto")}>
          <BoxWrapper
            title="HTML Template Source"
            icon={<Code2 className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={generateHTML} disabled={isLoadingHTML} className="h-7 text-[10px]">
                  <RefreshCw className={cn("w-3 h-3 mr-1", isLoadingHTML && "animate-spin")} /> REGENERATE
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopyHTML} className="h-7 text-[10px]">
                  {copiedHTML ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />} COPY
                </Button>
              </div>
            }
          >
            <div className="relative bg-slate-900 rounded h-[450px] border border-slate-800">
              {isLoadingHTML && <LoadingOverlay />}
              <pre className="p-4 font-mono text-[10px] text-blue-300 overflow-auto h-full scrollbar-thin">
                {generatedHTML || "Constructing HTML Layout..."}
              </pre>
            </div>
          </BoxWrapper>

          <BoxWrapper
            title="Desktop Preview"
            icon={<Monitor className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadHTML} disabled={!generatedHTML} className="h-7 text-[10px] border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Download className="w-3 h-3 mr-1" /> HTML
                </Button>
                <Button onClick={downloadPDF} disabled={!generatedHTML} className="h-7 bg-red-600 hover:bg-red-700 text-white text-[10px] shadow-sm">
                  <FileText className="w-3 h-3 mr-1" /> DOWNLOAD PDF
                </Button>
              </div>
            }
          >
            <div className="relative bg-white border border-slate-200 rounded h-[450px] overflow-hidden shadow-sm">
              {isLoadingHTML && <LoadingOverlay />}
              {generatedHTML ? (
                <iframe
                  id="html-preview-iframe"
                  srcDoc={generatedHTML}
                  className="w-full h-full border-none"
                  title="HTML Preview"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Awaiting HTML generation...
                </div>
              )}
            </div>
          </BoxWrapper>
        </div>
      )}

      {/* STICKY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 z-50">
        <div className="max-w-7xl mx-auto flex justify-between">
          <Button variant="ghost" onClick={prevStep} className="font-bold text-[10px] uppercase tracking-widest text-slate-500">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={nextStep} className="bg-[#1c2b39] hover:bg-slate-800 text-white px-12 font-bold text-[10px] uppercase tracking-widest shadow-lg">
            Finalize & Save <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function BoxWrapper({ title, icon, children, actions }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col space-y-3">
      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
          {icon} {title}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );
}

// import { useEffect, useState, useCallback } from 'react';
// import { useWizard } from '@/context/WizardContext';
// import { Button } from '@/components/ui/button';
// import {
//     ArrowLeft,
//     ArrowRight,
//     Copy,
//     RefreshCw,
//     Check,
//     FileCode,
//     ImageIcon,
//     FileText,
//     Download,
//     Code2,
//     Monitor,
//     Loader2
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/lib/utils';

// /*
// |--------------------------------------------------------------------------
// | TemplateGenerate (Production Version)
// |--------------------------------------------------------------------------
// | Handles:
// | - ZPL + HTML generation
// | - Preview rendering
// | - Copy + Download actions
// | - Safe auto-generation guards
// |--------------------------------------------------------------------------
// */

// export function TemplateGenerate() {

//     const {
//         generatedZPL, setGeneratedZPL,
//         generatedHTML, setGeneratedHTML,
//         nextStep, prevStep,
//         uploadedFile,
//         outputMode,
//         modifiedLabelBlob
//     } = useWizard();

//     const [previewImage, setPreviewImage] = useState<string | null>(null);

//     const [loadingZPL, setLoadingZPL] = useState(false);
//     const [loadingHTML, setLoadingHTML] = useState(false);

//     const [copiedZPL, setCopiedZPL] = useState(false);
//     const [copiedHTML, setCopiedHTML] = useState(false);

//     /*
//     ------------------------------------------------
//     File source priority
//     ------------------------------------------------
//     */
//     const fileToSend = modifiedLabelBlob || uploadedFile;

//     /*
//     ------------------------------------------------
//     ZPL Generation
//     ------------------------------------------------
//     */

//     const generateZPL = useCallback(async () => {

//         if (!fileToSend || (outputMode !== "zpl" && outputMode !== "both")) return;

//         setLoadingZPL(true);

//         const formData = new FormData();
//         formData.append("image", fileToSend);

//         try {

//             const res = await fetch(
//                 "http://localhost:5050/generate-zpl",
//                 {
//                     method: "POST",
//                     body: formData
//                 }
//             );

//             const data = await res.json();

//             if (data.status === "success") {
//                 setGeneratedZPL(data.zpl_code);
//                 setPreviewImage(data.labelary_preview);
//             }

//         } catch {
//             toast.error("ZPL Generation Failed");
//         } finally {
//             setLoadingZPL(false);
//         }

//     }, [fileToSend, outputMode]);

//     /*
//     ------------------------------------------------
//     HTML Generation
//     ------------------------------------------------
//     */

//     const generateHTML = useCallback(async () => {

//         if (!fileToSend || (outputMode !== "html" && outputMode !== "both")) return;

//         setLoadingHTML(true);

//         const formData = new FormData();
//         formData.append("image", fileToSend);

//         try {

//             const res = await fetch(
//                 "http://localhost:5050/replicate-invoice",
//                 {
//                     method: "POST",
//                     body: formData
//                 }
//             );

//             const data = await res.json();

//             if (data.status === "success") {
//                 setGeneratedHTML(data.full_html);
//             }

//         } catch {
//             toast.error("HTML Generation Failed");
//         } finally {
//             setLoadingHTML(false);
//         }

//     }, [fileToSend, outputMode]);

//     /*
//     ------------------------------------------------
//     Auto Generation Guard
//     Prevents infinite loops
//     ------------------------------------------------
//     */

//     useEffect(() => {

//         const shouldGenerateZPL =
//             (outputMode === "zpl" || outputMode === "both") &&
//             !generatedZPL &&
//             !loadingZPL;

//         const shouldGenerateHTML =
//             (outputMode === "html" || outputMode === "both") &&
//             !generatedHTML &&
//             !loadingHTML;

//         if (shouldGenerateZPL) generateZPL();
//         if (shouldGenerateHTML) generateHTML();

//     }, [
//         outputMode,
//         generatedZPL,
//         generatedHTML,
//         loadingZPL,
//         loadingHTML
//     ]);

//     /*
//     ------------------------------------------------
//     Clipboard Actions
//     ------------------------------------------------
//     */

//     const copyZPL = () => {
//         navigator.clipboard.writeText(generatedZPL || "");
//         setCopiedZPL(true);
//         toast.success("ZPL copied");

//         setTimeout(() => setCopiedZPL(false), 2000);
//     };

//     const copyHTML = () => {
//         navigator.clipboard.writeText(generatedHTML || "");
//         setCopiedHTML(true);
//         toast.success("HTML copied");

//         setTimeout(() => setCopiedHTML(false), 2000);
//     };

//     /*
//     ------------------------------------------------
//     Downloads
//     ------------------------------------------------
//     */

//     const downloadHTML = () => {
//         if (!generatedHTML) return;

//         const blob = new Blob([generatedHTML], { type: "text/html" });
//         const url = URL.createObjectURL(blob);

//         const a = document.createElement("a");
//         a.href = url;
//         a.download = "template.html";
//         a.click();

//         URL.revokeObjectURL(url);
//     };

//     const downloadPDF = () => {

//         const iframe = document.getElementById(
//             "template-preview-iframe"
//         ) as HTMLIFrameElement;

//         if (iframe?.contentWindow) {
//             iframe.contentWindow.print();
//         } else {
//             toast.error("Preview not ready");
//         }
//     };

//     /*
//     ------------------------------------------------
//     UI
//     ------------------------------------------------
//     */

//     return (
//         <div className="max-w-7xl mx-auto pb-32 px-4 space-y-8 animate-fade-in">

//             {/* ZPL Section */}
//             {(outputMode === "zpl" || outputMode === "both") && (
//                 <Box title="ZPL Source" icon={<FileCode className="w-4 h-4" />}>

//                     <div className="relative bg-slate-950 rounded h-[350px] border border-slate-800">

//                         {loadingZPL && <LoadingOverlay />}

//                         <pre className="p-4 text-[10px] font-mono text-emerald-400 h-full overflow-auto">
//                             {generatedZPL || "Initializing ZPL Engine..."}
//                         </pre>
//                     </div>

//                     <div className="flex gap-2 mt-3">
//                         <Button size="sm" variant="outline" onClick={generateZPL}>
//                             <RefreshCw className={cn("w-3 h-3 mr-1", loadingZPL && "animate-spin")} />
//                             Regenerate
//                         </Button>

//                         <Button size="sm" variant="outline" onClick={copyZPL}>
//                             {copiedZPL ? <Check className="w-3 h-3 mr-1" /> :
//                                 <Copy className="w-3 h-3 mr-1" />}
//                             Copy
//                         </Button>
//                     </div>

//                 </Box>
//             )}

//             {/* HTML Section */}
//             {(outputMode === "html" || outputMode === "both") && (
//                 <Box title="HTML Template Source" icon={<Code2 className="w-4 h-4" />}>

//                     <div className="relative bg-slate-900 rounded h-[450px] border border-slate-800">

//                         {loadingHTML && <LoadingOverlay />}

//                         <pre className="p-4 text-[10px] text-blue-300 h-full overflow-auto font-mono">
//                             {generatedHTML || "Constructing HTML Layout..."}
//                         </pre>
//                     </div>

//                     <div className="flex gap-2 mt-3">

//                         <Button size="sm" variant="outline" onClick={generateHTML}>
//                             <RefreshCw className={cn("w-3 h-3 mr-1", loadingHTML && "animate-spin")} />
//                             Regenerate
//                         </Button>

//                         <Button size="sm" variant="outline" onClick={copyHTML}>
//                             {copiedHTML ? <Check className="w-3 h-3 mr-1" /> :
//                                 <Copy className="w-3 h-3 mr-1" />}
//                             Copy
//                         </Button>

//                     </div>

//                 </Box>
//             )}

//             {/* Preview */}
//             {outputMode !== "html" && outputMode !== "zpl" && (
//                 <Box title="Desktop Preview" icon={<Monitor className="w-4 h-4" />}>

//                     <div className="relative h-[450px] border rounded overflow-hidden">

//                         {generatedHTML ? (
//                             <iframe
//                                 id="template-preview-iframe"
//                                 srcDoc={generatedHTML}
//                                 className="w-full h-full border-none"
//                             />
//                         ) : (
//                             <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
//                                 Awaiting Template Generation...
//                             </div>
//                         )}

//                     </div>

//                     <div className="flex gap-2 mt-3">
//                         <Button variant="outline" onClick={downloadHTML}>
//                             <Download className="w-3 h-3 mr-1" />
//                             Download HTML
//                         </Button>

//                         <Button className="bg-red-600 text-white" onClick={downloadPDF}>
//                             <FileText className="w-3 h-3 mr-1" />
//                             Download PDF
//                         </Button>
//                     </div>

//                 </Box>
//             )}

//             {/* Footer */}
//             <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t p-4">
//                 <div className="max-w-7xl mx-auto flex justify-between">

//                     <Button variant="ghost" onClick={prevStep}>
//                         <ArrowLeft className="w-4 h-4 mr-2" />
//                         Back
//                     </Button>

//                     <Button className="bg-[#1c2b39] text-white px-10" onClick={nextStep}>
//                         Finalize
//                         <ArrowRight className="w-4 h-4 ml-2" />
//                     </Button>

//                 </div>
//             </div>

//         </div>
//     );
// }

// /*
// |--------------------------------------------------------------------------
// | Shared Components
// |--------------------------------------------------------------------------
// */

// function Box({ title, icon, children }: any) {
//     return (
//         <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
//             <div className="flex justify-between items-center border-b pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
//                 <div className="flex items-center gap-2">
//                     {icon} {title}
//                 </div>
//             </div>
//             {children}
//         </div>
//     );
// }

// function LoadingOverlay() {
//     return (
//         <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
//             <Loader2 className="w-8 h-8 text-white animate-spin" />
//         </div>
//     );
// }
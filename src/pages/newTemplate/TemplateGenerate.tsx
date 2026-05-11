import { useEffect, useState, useCallback } from "react";
import { useWizard } from "@/context/WizardContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  RefreshCw,
  Check,
  FileCode,
  ImageIcon,
  Loader2,
  FileText,
  Download,
  Code2,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
const flaskAPI = import.meta.env.VITE_FLASK_API;

export function TemplateGenerate() {
  const {
    generatedZPL,
    setGeneratedZPL,
    generatedHTML,
    setGeneratedHTML,
    generatedXDP,
    setGeneratedXDP,
    nextStep,
    prevStep,
    uploadedFile,
    uploadedImage,
    outputMode,
    modifiedLabelBlob,
  } = useWizard();

  const baseUrl = flaskAPI || 'http://localhost:5050';

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingZPL, setIsLoadingZPL] = useState(false);
  const [isLoadingHTML, setIsLoadingHTML] = useState(false);
  const [isLoadingXDP, setIsLoadingXDP] = useState(false);
  const [copiedZPL, setCopiedZPL] = useState(false);
  const [copiedHTML, setCopiedHTML] = useState(false);
  const [copiedXDP, setCopiedXDP] = useState(false);
  const [xdpLayout, setXdpLayout] = useState<any[]>([]);

  // --- API Call: ZPL Generation ---
  const generateZPL = useCallback(async () => {
    const fileToSend = modifiedLabelBlob;
    if (!fileToSend) {
      toast.error("Design snapshot missing. Please go back and re-finalize design.");
      return;
    }

    if (!fileToSend || (outputMode !== "zpl" && outputMode !== "all")) return;

    setIsLoadingZPL(true);
    const formData = new FormData();
    formData.append("image", fileToSend);
    if (generatedHTML) formData.append("html_design", generatedHTML);
    try {
      // const res = await fetch('http://localhost:5050/generate-zpl', { method: 'POST', body: formData });
      const res = await fetch(`${baseUrl}/generate-zpl`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
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
    const fileToSend = modifiedLabelBlob;

    if (!fileToSend || (outputMode !== "html" && outputMode !== "all")) return;
    setIsLoadingHTML(true);
    const formData = new FormData();
    formData.append("image", fileToSend);
    try {
      // const res = await fetch('http://localhost:5050/replicate-invoice', { method: 'POST', body: formData });
      const res = await fetch(`${baseUrl}/replicate-invoice`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        setGeneratedHTML(data.full_html);
      }
    } catch (e) {
      toast.error("HTML Generation Failed");
    } finally {
      setIsLoadingHTML(false);
    }
  }, [uploadedFile, modifiedLabelBlob, outputMode, setGeneratedHTML]);

  // --- API Call: XDP Generation ---
  const generateXDP = useCallback(async () => {
    const fileToSend = modifiedLabelBlob;
    if (!fileToSend || (outputMode !== "xdp" && outputMode !== "all")) return;
    setIsLoadingXDP(true);
    const formData = new FormData();
    formData.append("image", fileToSend);
    if (generatedHTML) formData.append("html_design", generatedHTML);
    try {
      const res = await fetch(`${baseUrl}/generate-xdp`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        setGeneratedXDP(data.xdp_code);
        setXdpLayout(data.layout_preview || []);
      }
    } catch (e) {
      toast.error("XDP Generation Failed");
    } finally {
      setIsLoadingXDP(false);
    }
  }, [uploadedFile, modifiedLabelBlob, outputMode, setGeneratedXDP]);

  // --- Effect: Trigger Generation on Load (with Guardrails) ---
  useEffect(() => {
    if (
      (outputMode === "zpl" || outputMode === "all") &&
      !generatedZPL &&
      !isLoadingZPL
    ) {
      generateZPL();
    }
    if (
      (outputMode === "html" || outputMode === "all") &&
      !generatedHTML &&
      !isLoadingHTML
    ) {
      generateHTML();
    }
    if (
      (outputMode === "xdp" || outputMode === "all") &&
      !generatedXDP &&
      !isLoadingXDP
    ) {
      generateXDP();
    }
  }, [
    outputMode,
    generatedZPL,
    generatedHTML,
    generatedXDP,
    isLoadingZPL,
    isLoadingHTML,
    isLoadingXDP,
    generateZPL,
    generateHTML,
    generateXDP,
  ]);

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
    const blob = new Blob([generatedHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-template.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyXDP = () => {
    navigator.clipboard.writeText(generatedXDP || "");
    setCopiedXDP(true);
    toast.success("XDP source copied");
    setTimeout(() => setCopiedXDP(false), 2000);
  };

  const downloadXDP = () => {
    if (!generatedXDP) return;
    const blob = new Blob([generatedXDP], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-template.xdp";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const iframe = document.getElementById(
      "html-preview-iframe",
    ) as HTMLIFrameElement;
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
      {(outputMode === "zpl" || outputMode === "all") && (
        <div
          className={cn(
            "grid gap-6",
            outputMode === "all"
              ? "lg:grid-cols-2"
              : "grid-cols-1 max-w-4xl mx-auto",
          )}
        >
          <BoxWrapper
            title="ZPL Source"
            icon={<FileCode className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateZPL}
                  disabled={isLoadingZPL}
                  className="h-7 text-[10px]"
                >
                  <RefreshCw
                    className={cn(
                      "w-3 h-3 mr-1",
                      isLoadingZPL && "animate-spin",
                    )}
                  />{" "}
                  REGENERATE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyZPL}
                  className="h-7 text-[10px]"
                >
                  {copiedZPL ? (
                    <Check className="w-3 h-3 mr-1" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}{" "}
                  COPY
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

          <BoxWrapper
            title="Thermal Preview"
            icon={<ImageIcon className="w-4 h-4" />}
          >
            <div className="bg-slate-200 rounded h-[350px] flex items-center justify-center p-6 relative shadow-inner border border-slate-300">
              {isLoadingZPL && <LoadingOverlay />}
              {previewImage ? (
                <img
                  src={previewImage}
                  className="max-h-full border-4 border-white shadow-2xl"
                  alt="Label Preview"
                />
              ) : (
                <span className="text-slate-400 text-xs italic font-medium">
                  Awaiting AI Render...
                </span>
              )}
            </div>
          </BoxWrapper>
        </div>
      )}

      {/* HTML SECTION */}
      {(outputMode === "html" || outputMode === "all") && (
        <div
          className={cn(
            "grid gap-6",
            outputMode === "all"
              ? "lg:grid-cols-2"
              : "grid-cols-1 max-w-4xl mx-auto",
          )}
        >
          <BoxWrapper
            title="HTML Template Source"
            icon={<Code2 className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateHTML}
                  disabled={isLoadingHTML}
                  className="h-7 text-[10px]"
                >
                  <RefreshCw
                    className={cn(
                      "w-3 h-3 mr-1",
                      isLoadingHTML && "animate-spin",
                    )}
                  />{" "}
                  REGENERATE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyHTML}
                  className="h-7 text-[10px]"
                >
                  {copiedHTML ? (
                    <Check className="w-3 h-3 mr-1" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}{" "}
                  COPY
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
                <Button
                  variant="outline"
                  onClick={downloadHTML}
                  disabled={!generatedHTML}
                  className="h-7 text-[10px] border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Download className="w-3 h-3 mr-1" /> HTML
                </Button>
                <Button
                  onClick={downloadPDF}
                  disabled={!generatedHTML}
                  className="h-7 bg-red-600 hover:bg-red-700 text-white text-[10px] shadow-sm"
                >
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

      {/* XDP SECTION */}
      {(outputMode === "xdp" || outputMode === "all") && (
        <div
          className={cn(
            "grid gap-6",
            outputMode === "all"
              ? "lg:grid-cols-2"
              : "grid-cols-1 max-w-4xl mx-auto",
          )}
        >
          <BoxWrapper
            title="Adobe XDP Source"
            icon={<FileText className="w-4 h-4" />}
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateXDP}
                  disabled={isLoadingXDP}
                  className="h-7 text-[10px]"
                >
                  <RefreshCw
                    className={cn(
                      "w-3 h-3 mr-1",
                      isLoadingXDP && "animate-spin",
                    )}
                  />{" "}
                  REGENERATE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyXDP}
                  className="h-7 text-[10px]"
                >
                  {copiedXDP ? (
                    <Check className="w-3 h-3 mr-1" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}{" "}
                  COPY
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadXDP}
                  disabled={!generatedXDP}
                  className="h-7 text-[10px]"
                >
                  <Download className="w-3 h-3 mr-1" /> XDP
                </Button>
              </div>
            }
          >
            <div className="relative bg-slate-900 rounded h-[450px] border border-slate-800">
              {isLoadingXDP && <LoadingOverlay />}
              <pre className="p-4 font-mono text-[10px] text-orange-300 overflow-auto h-full scrollbar-thin">
                {generatedXDP || "Architecting XDP Structure..."}
              </pre>
            </div>
          </BoxWrapper>

          <BoxWrapper
            title="XDP Structural Preview"
            icon={<Monitor className="w-4 h-4" />}
          >
            <div className="relative bg-slate-50 border border-slate-200 rounded h-[450px] overflow-hidden shadow-inner flex flex-col items-center justify-center">
               {isLoadingXDP && <LoadingOverlay />}
               
               {generatedXDP ? (
                 <div className="relative h-full w-full p-4 flex items-center justify-center">
                    <div className="relative border shadow-lg bg-white max-h-full">
                       <img src={uploadedImage || ""} className="max-h-[380px] object-contain opacity-40" alt="XDP Base" />
                       
                       <div className="absolute inset-0 pointer-events-none">
                          {xdpLayout.map((f, i) => (
                             <div 
                                key={i}
                                className="absolute border border-orange-500 bg-orange-500/10 flex items-center justify-center overflow-hidden"
                                style={{
                                   left: f.x,
                                   top: f.y,
                                   width: f.w || 'auto',
                                   height: f.h || 'auto',
                                   minWidth: '4px',
                                   minHeight: '4px'
                                }}
                             >
                                <span className="text-[6px] font-bold text-orange-700 truncate px-0.5">{f.name}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                    
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[8px] font-bold text-slate-500 border shadow-sm">
                       {xdpLayout.length} Fields Mapped
                    </div>
                 </div>
               ) : (
                 <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                       <FileText className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">XDP Preview Awaiting</h4>
                      <p className="text-[10px] text-slate-500 font-medium max-w-[240px] leading-relaxed">
                        The AI is architecting the XDP structure. Once complete, a structural "Ghost Preview" will appear here.
                      </p>
                    </div>
                 </div>
               )}
            </div>
          </BoxWrapper>
        </div>
      )}

      {/* STICKY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 z-50">
        <div className="max-w-7xl mx-auto flex justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            className="font-bold text-[10px] uppercase tracking-widest text-slate-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={nextStep}
            className="bg-[#1c2b39] hover:bg-slate-800 text-white px-12 font-bold text-[10px] uppercase tracking-widest shadow-lg"
          >
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

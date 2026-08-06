import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useWizard } from '@/context/WizardContext';
import { bootstrapTokenIfMissing } from '@/lib/api';
import { legacyApiUrl } from '@/lib/legacyApiBase';
import { LABEL_SIZES } from '@/data/labelData';
import { Switch } from '@/components/ui/switch';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
const flaskAPI = import.meta.env.VITE_FLASK_API;
const nodeAPI = import.meta.env.VITE_NODE_API;

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
    printSystemId,
    setPrintSystemId,
    selectedContext,
    setSelectedContext,
    selectedSize,
    setSelectedSize,
    chunks,
    lastAnalyzedFile,
    setGeneratedHTML
  } = useWizard();

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contexts, setContexts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".searchable-select-container")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filter contexts based on search term
  const filteredContexts = contexts.filter((ctx) =>
    ctx.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const fetchContexts = async () => {
      try {
        const catalogUrl = legacyApiUrl('/api/catalog');
        console.log("[TemplateUpload] Fetching contexts from:", catalogUrl);
        const response = await fetch(catalogUrl);
        const apis = await response.json();
        console.log("[TemplateUpload] API Catalog response:", apis);
        if (Array.isArray(apis)) {
          const dynamicContexts = apis.map((api: any) => ({
            id: `api-${api.id}`,
            name: api.name,
            isOData: !!(api.entities && Array.isArray(api.entities) && api.entities.length > 0),
            entities: api.entities || [],
            fields: api.fields || {},
            output_fields: Array.isArray(api.output_fields) ? api.output_fields : [],
          }));
          // Sort contexts alphabetically by name (strictly case-insensitive A-Z)
          dynamicContexts.sort((a, b) => {
            const nameA = (a.name || "").toLowerCase().trim();
            const nameB = (b.name || "").toLowerCase().trim();
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
          });
          console.log("[TemplateUpload] Mapped and sorted contexts:", dynamicContexts);
          setContexts(dynamicContexts);
        } else {
          console.warn("API Catalog returned non-array response:", apis);
          setContexts([]);
        }
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

  const [hasCachedData, setHasCachedData] = useState(false);
  const currentFileSignature = uploadedFile ? `${uploadedFile.name}-${uploadedFile.size}-${uploadedFile.lastModified}` : null;
  const isAlreadyAnalyzed = lastAnalyzedFile === currentFileSignature && chunks.length > 0;

  useEffect(() => {
    if (currentFileSignature) {
      const cached = localStorage.getItem(`nx_preprocess_cache_${currentFileSignature}`);
      setHasCachedData(!!cached);
    } else {
      setHasCachedData(false);
    }
  }, [currentFileSignature]);

  const handleUsePreprocessedData = () => {
    if (!currentFileSignature) return;
    const cachedDataStr = localStorage.getItem(`nx_preprocess_cache_${currentFileSignature}`);
    if (!cachedDataStr) return;
    try {
      const cached = JSON.parse(cachedDataStr);
      setAnalysisResults(
        cached.extracted_fields,
        cached.annotated_images,
        cached.clean_images
      );
      setGeneratedHTML(cached.generatedHTML);
      nextStep();
    } catch (err) {
      console.error("Error loading preprocessed data:", err);
      setErrorMessage("Failed to load cached preprocessed data.");
    }
  };

  const handleUploadAndProcess = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus("Analyzing layout patterns...");

    const formData = new FormData();
    formData.append('image', uploadedFile);

    const baseUrl = flaskAPI || 'http://localhost:5050';
    const analyzeUrl = `${baseUrl}/analyze-label`;

    try {
      // Step A: Perform layout analysis
      console.log("Combined Step A: Running analysis on:", analyzeUrl);
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log("Analysis results received:", data);

      if (data.status !== "success") {
        setErrorMessage(data.error || "Analysis failed");
        setIsProcessing(false);
        setProcessingStatus("");
        return;
      }

      // Store layout analysis in context chunks
      setAnalysisResults(
        data.extracted_fields,
        data.annotated_images && data.annotated_images.length > 0 ? data.annotated_images : data.annotated_image,
        data.clean_images && data.clean_images.length > 0 ? data.clean_images : data.clean_image
      );

      // Step B: Automatically run HTML Design replication immediately afterwards
      setProcessingStatus("Generating HTML replica...");
      const replicateUrl = `${baseUrl}/replicate-invoice`;
      console.log("Combined Step B: Running replication on:", replicateUrl);

      const repFormData = new FormData();
      repFormData.append('image', uploadedFile);

      // Pass the pre-cropped logo and signature from Step A's analysis directly to replication
      const logo = data.extracted_fields?.find((c: any) => c.content_type === 'logo')?.cropped_b64;
      const signature = data.extracted_fields?.find((c: any) => c.content_type === 'signature')?.cropped_b64;

      if (logo) repFormData.append("logo_b64", logo);
      if (signature) repFormData.append("signature_b64", signature);

      const repResponse = await fetch(replicateUrl, {
        method: "POST",
        body: repFormData
      });

      const repData = await repResponse.json();
      console.log("Replication results received:", repData);

      if (repData.status === "success") {
        setGeneratedHTML(repData.full_html);
        
        // Cache preprocessed results persistently
        if (currentFileSignature) {
          const cacheData = {
            extracted_fields: data.extracted_fields,
            annotated_images: data.annotated_images && data.annotated_images.length > 0 ? data.annotated_images : data.annotated_image,
            clean_images: data.clean_images && data.clean_images.length > 0 ? data.clean_images : data.clean_image,
            generatedHTML: repData.full_html
          };
          try {
            localStorage.setItem(`nx_preprocess_cache_${currentFileSignature}`, JSON.stringify(cacheData));
            setHasCachedData(true);
          } catch (e) {
            console.warn("Failed to store preprocessed layout in cache:", e);
          }
        }

        nextStep();
      } else {
        setErrorMessage(repData.error || "HTML design replication failed");
      }
    } catch (err) {
      console.error("Combined sequential process error:", err);
      setErrorMessage("Connection error: backend not reachable.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
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

        {/* Business Context (Searchable Dropdown) */}
        <div className="space-y-2 searchable-select-container relative">
          <label className="text-xs font-body text-muted-foreground">
            Business Context
          </label>
          
          {/* Selected Trigger Button */}
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-body cursor-pointer flex justify-between items-center hover:border-accent/50 transition-all shadow-sm select-none"
          >
            <span className={selectedContext ? "text-foreground font-medium" : "text-muted-foreground"}>
              {selectedContext?.name || "Select context..."}
            </span>
            <svg
              className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isDropdownOpen && "rotate-180")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Search Dropdown Panel */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg flex flex-col overflow-hidden max-h-[300px]">
              {/* Search input box */}
              <div className="p-2 border-b border-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center">
                <svg className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs font-body focus:outline-none border-none p-0.5 text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-muted-foreground hover:text-foreground text-[10px] font-bold p-0.5"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Mapped filtered items list */}
              <div className="overflow-y-auto max-h-[220px] divide-y divide-border/20">
                {filteredContexts.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground text-center font-body">
                    No matching contexts found
                  </div>
                ) : (
                  filteredContexts.map((ctx) => {
                    const isSelected = selectedContext?.id === ctx.id;
                    return (
                      <button
                        key={ctx.id}
                        onClick={() => {
                          setSelectedContext(ctx);
                          setIsDropdownOpen(false);
                          setSearchTerm("");
                        }}
                        className={cn(
                          "w-full text-left px-3.5 py-2.5 text-xs font-body transition-colors flex items-center justify-between",
                          isSelected ? "bg-accent/10 text-accent font-semibold" : "hover:bg-muted/50 text-foreground"
                        )}
                      >
                        <span className="truncate">{ctx.name}</span>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-accent shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
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
          </select>
        </div>

        {/* Print System ID */}
        <div className="space-y-2">
          <label className="text-xs font-body text-muted-foreground">
            Print System ID
          </label>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-sm font-body text-foreground">
              {printSystemId ? "True" : "False"}
            </span>
            <Switch
              checked={printSystemId}
              onCheckedChange={(checked) => setPrintSystemId(!!checked)}
              aria-label="Toggle print system id"
            />
          </div>
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

        {/* Action Buttons */}
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            disabled={!uploadedFile || isProcessing}
            onClick={() => {
              setUploadedFile(null);
              setUploadedImage(null);
              setErrorMessage(null);
              setProcessingStatus("");
              setGeneratedHTML(null);
              setAnalysisResults([], null);
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all disabled:opacity-40 border border-border bg-background text-foreground"
          >
            Clear
          </button>
          <div className="flex gap-3">
            {hasCachedData && (
              <button
                type="button"
                disabled={isProcessing || !selectedContext || !selectedSize}
                onClick={handleUsePreprocessedData}
                className="px-5 py-2 rounded-lg text-sm font-semibold font-body transition-all text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow"
              >
                Use Preprocessed Data
              </button>
            )}
            <button
              type="button"
              disabled={
                !uploadedImage ||
                !selectedContext ||
                !selectedSize ||
                isProcessing
              }
              onClick={handleUploadAndProcess}
              className="px-6 py-2 rounded-lg text-sm font-semibold font-body transition-all disabled:opacity-40"
              style={{
                background: hasCachedData ? "transparent" : "hsl(var(--accent))",
                border: hasCachedData ? "1px solid hsl(var(--border))" : "none",
                color: hasCachedData ? "hsl(var(--foreground))" : "white"
              }}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {processingStatus || "Analyzing..."}
                </span>
              ) : (
                hasCachedData ? "Re-Analyze File" : "Analyze & Continue"
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
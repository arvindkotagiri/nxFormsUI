import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useWizard } from '@/context/WizardContext';
import { bootstrapTokenIfMissing } from '@/lib/api';
import { legacyApiUrl } from '@/lib/legacyApiBase';
import { LABEL_SIZES } from '@/data/labelData';
import { Switch } from '@/components/ui/switch';
import { Upload, Loader2 } from 'lucide-react';
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
          console.log("[TemplateUpload] Mapped contexts:", dynamicContexts);
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

  const currentFileSignature = uploadedFile ? `${uploadedFile.name}-${uploadedFile.size}-${uploadedFile.lastModified}` : null;
  const isAlreadyAnalyzed = lastAnalyzedFile === currentFileSignature && chunks.length > 0;

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

        {/* Action Button */}
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
              background: "hsl(var(--accent))",
              color: "white"
            }}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                {processingStatus || "Analyzing..."}
              </span>
            ) : (
              "Analyze & Continue"
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
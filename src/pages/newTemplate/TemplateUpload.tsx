import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useWizard } from '@/context/WizardContext';
import { LABEL_SIZES } from '@/data/labelData';
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
  const [contexts, setContexts] = useState<any[]>([]);

  useEffect(() => {
    const fetchContexts = async () => {
      try {
        const response = await fetch(`${flaskAPI || 'http://localhost:5050'}/api/catalog`);
        const apis = await response.json();
        if (Array.isArray(apis)) {
          const dynamicContexts = apis.map((api: any) => ({
            id: `api-${api.id}`,
            name: api.name,
            isOData: !!(api.entities && Array.isArray(api.entities) && api.entities.length > 0),
            entities: api.entities || [],
            fields: api.fields || {}
          }));
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

    if (isAlreadyAnalyzed) {
      nextStep();
      return;
    }

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
import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { legacyApiUrl } from '@/lib/legacyApiBase';

export type Transformation = {
  type:
    | 'to_upper'
    | 'to_lower'
    | 'concatenate'
    | 'format_date'
    | 'add'
    | 'multiply'
    | 'if_else'
    | 'default_value';
  value?: string | number;
};
export type TableCell = {
  value: string;
  category: 'static' | 'dynamic';
  fieldMapping?: string;
};

export type LabelChunk = {
  id: string;
  type: 'text' | 'barcode' | 'table_cell' | 'table' | 'logo' | 'signature';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value?: string;
  isStatic: boolean;
  fieldMapping?: string;
  transformations?: Transformation[]; 
  barcodeType?: 'code128' | 'code39' | 'itf14' | 'qr';
  // Table specific
  rows?: TableCell[][];
  headers?: string[];
  isDynamicTable?: boolean;
  cropped_b64?: string;
  originalLabel?: string;
  pageIndex?: number; // Tag representing page (0-indexed)
};

export type LabelSize = {
  id: string;
  name: string;
  width: number;
  height: number;
};

// Added 'zpl', 'html', 'xdp', or 'all' as valid output modes
export type OutputMode = 'zpl' | 'html' | 'xdp' | 'all';
export type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  currentStep: WizardStep;
  uploadedFile: File | null;
  uploadedImage: string | null;
  cleanImage: string | null;
  annotatedImage: string | null;
  uploadedImages: string[]; // Multi-page support
  cleanImages: string[]; // Multi-page support
  annotatedImages: string[]; // Multi-page support
  chunks: LabelChunk[];
  selectedContext: any | null;
  selectedSize: LabelSize | null;
  labelName: string;
  outputMode: OutputMode; // New State
  watermarkName: string;
  printSystemId: boolean;
  modifiedLabelBlob: Blob | null; // Captured from Step 3
  generatedZPL: string | null;
  generatedHTML: string | null;
  generatedXDP: string | null;
  lastAnalyzedFile: string | null; // Name + Size + Type
  editingUuid: string | null; // Track database template edit ID
  labelId: string; // Store template ID
}

interface WizardContextType extends WizardState {
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setUploadedFile: (file: File | null) => void;
  setUploadedImage: (image: string | null) => void;
  setAnnotatedImage: (image: string | null) => void;
  setCleanImage: (image: string | null) => void;
  setAnalysisResults: (fields: any[], annotatedImg: string | string[], cleanImg?: string | string[]) => void;
  setChunks: (chunks: LabelChunk[]) => void;
  addChunk: (chunk: LabelChunk) => void;
  updateChunk: (id: string, updates: Partial<LabelChunk>) => void;
  removeChunk: (id: string) => void;
  setSelectedContext: (context: any | null) => void;
  setSelectedSize: (size: LabelSize | null) => void;
  setLabelName: (name: string) => void;
  setOutputMode: (mode: OutputMode) => void; // New Action
  setWatermarkName: (name: string) => void;
  setPrintSystemId: (enabled: boolean) => void;
  setModifiedLabelBlob: (blob: Blob | null) => void;
  setGeneratedZPL: (zpl: string | null) => void;
  setGeneratedHTML: (html: string | null) => void;
  setGeneratedXDP: (xdp: string | null) => void;
  reset: () => void;
  loadSavedTemplate: (template: any, contextObj: any) => void;
  setLabelId: (id: string) => void;
}

const initialState: WizardState = {
  currentStep: 1,
  uploadedFile: null,
  uploadedImage: null,
  cleanImage: null,
  annotatedImage: null,
  uploadedImages: [],
  cleanImages: [],
  annotatedImages: [],
  chunks: [],
  selectedContext: null,
  selectedSize: null,
  labelName: '',
  outputMode: 'zpl', // Default to zpl
  watermarkName: '',
  printSystemId: false,
  modifiedLabelBlob: null,
  generatedZPL: null,
  generatedHTML: null,
  generatedXDP: null,
  lastAnalyzedFile: null,
  editingUuid: null,
  labelId: '',
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);

  const setStep = (step: WizardStep) => setState(prev => ({ ...prev, currentStep: step }));
  const nextStep = () => setState(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, 5) as WizardStep }));
  const prevStep = () => setState(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 1) as WizardStep }));

  const setUploadedFile = (file: File | null) => setState(prev => ({ ...prev, uploadedFile: file }));
  const setUploadedImage = (image: string | null) => setState(prev => ({ 
    ...prev, 
    uploadedImage: image, 
    uploadedImages: image ? [image] : [] 
  }));
  const setAnnotatedImage = (image: string | null) => setState(prev => ({ 
    ...prev, 
    annotatedImage: image, 
    annotatedImages: image ? [image] : [] 
  }));
  const setCleanImage = (image: string | null) => setState(prev => ({ 
    ...prev, 
    cleanImage: image, 
    cleanImages: image ? [image] : [] 
  }));

  const setAnalysisResults = useCallback((fields: any[], annotatedImg: string | string[], cleanImg?: string | string[]) => {
    if (!Array.isArray(fields)) {
      console.warn("setAnalysisResults: fields is not an array", fields);
      return;
    }

    const cleanImgs = Array.isArray(cleanImg) ? cleanImg : (cleanImg ? [cleanImg] : []);
    const annotatedImgs = Array.isArray(annotatedImg) ? annotatedImg : (annotatedImg ? [annotatedImg] : []);

    const mappedChunks: LabelChunk[] = fields.map((field, index) => {
      // Safety check for box_2d
      const box = Array.isArray(field.box_2d) && field.box_2d.length === 4 
        ? field.box_2d 
        : [0, 0, 0, 0];
        
      const [ymin, xmin, ymax, xmax] = box;
      const isTable = field.content_type === 'table';
      const isBarcode = field.content_type === 'barcode';
      const isQrCode = field.content_type === 'qrcode' || field.content_type === 'qr';
      
      return {
        id: `chunk-${index}-${Date.now()}`,
        type: isTable ? 'table' : ((isBarcode || isQrCode) ? 'barcode' : (field.content_type === 'table_cell' ? 'table_cell' : (field.content_type === 'logo' ? 'logo' : (field.content_type === 'signature' ? 'signature' : 'text')))),
        x: xmin / 10,
        y: ymin / 10,
        width: (xmax - xmin) / 10,
        height: (ymax - ymin) / 10,
        label: field.field_name || `field_${index}`,
        value: field.value || "",
        isStatic: field.category === 'static',
        barcodeType: isQrCode ? 'qr' : (isBarcode ? 'code128' : undefined),
        transformations: [],
        rows: isTable ? field.table_data : undefined,
        isDynamicTable: isTable,
        cropped_b64: field.cropped_b64,
        pageIndex: field.page_index !== undefined ? field.page_index : 0
      };
    });

    setState(prev => {
      const fileSignature = prev.uploadedFile ? `${prev.uploadedFile.name}-${prev.uploadedFile.size}-${prev.uploadedFile.lastModified}` : null;
      return { 
        ...prev, 
        chunks: mappedChunks, 
        annotatedImage: annotatedImgs[0] || null, 
        cleanImage: cleanImgs[0] || null,
        annotatedImages: annotatedImgs,
        cleanImages: cleanImgs,
        lastAnalyzedFile: fileSignature
      };
    });
  }, []);

  const setChunks = (chunks: LabelChunk[]) => setState(prev => ({ ...prev, chunks }));
  const addChunk = (chunk: LabelChunk) => setState(prev => ({ ...prev, chunks: [...prev.chunks, chunk] }));
  const updateChunk = (id: string, updates: Partial<LabelChunk>) => {
    setState(prev => {
      const chunk = prev.chunks.find(c => c.id === id);
      let nextHtml = prev.generatedHTML;
      if (chunk && updates.label && updates.label !== chunk.label && nextHtml) {
        nextHtml = nextHtml.split(`{{${chunk.label}}}`).join(`{{${updates.label}}}`);
      }
      return {
        ...prev,
        generatedHTML: nextHtml,
        chunks: prev.chunks.map(c => (c.id === id ? { ...c, ...updates } : c)),
      };
    });
  };
  const removeChunk = (id: string) => {
    setState(prev => {
      const chunk = prev.chunks.find(c => c.id === id);
      let nextHtml = prev.generatedHTML;
      if (chunk && nextHtml) {
        nextHtml = nextHtml.split(`{{${chunk.label}}}`).join("");
      }
      return {
        ...prev,
        generatedHTML: nextHtml,
        chunks: prev.chunks.filter(c => c.id !== id),
      };
    });
  };

  const setSelectedContext = (context: any | null) => setState(prev => ({ ...prev, selectedContext: context }));
  const setSelectedSize = (size: LabelSize | null) => setState(prev => ({ ...prev, selectedSize: size }));
  const setLabelName = (name: string) => setState(prev => ({ ...prev, labelName: name }));
  const setOutputMode = (mode: OutputMode) => setState(prev => ({ ...prev, outputMode: mode }));
  const setWatermarkName = (name: string) => setState(prev => ({ ...prev, watermarkName: name }));
  const setPrintSystemId = (enabled: boolean) => setState(prev => ({ ...prev, printSystemId: enabled }));

  const setModifiedLabelBlob = (blob: Blob | null) => setState(prev => ({ ...prev, modifiedLabelBlob: blob }));

  const setGeneratedZPL = (zpl: string | null) => setState(prev => ({ ...prev, generatedZPL: zpl }));
  const setGeneratedHTML = (html: string | null) => setState(prev => ({ ...prev, generatedHTML: html }));
  const setGeneratedXDP = (xdp: string | null) => setState(prev => ({ ...prev, generatedXDP: xdp }));

  const setLabelId = (id: string) => setState(prev => ({ ...prev, labelId: id }));

  const loadSavedTemplate = async (template: any, contextObj?: any) => {
    setState(prev => ({
      ...prev,
      editingUuid: template.uuid || null,
      labelId: template.label_id || '',
      labelName: template.label_name || '',
      selectedContext: contextObj || { name: template.context, entities: [], fields: {} },
      chunks: Array.isArray(template.fields) ? template.fields : (typeof template.fields === 'string' ? JSON.parse(template.fields) : []),
      generatedHTML: template.html_code || '',
      generatedZPL: template.zpl_code || '',
      generatedXDP: template.xdp_code || '',
      outputMode: template.output_mode || 'zpl',
      watermarkName: template.watermark || '',
      printSystemId: template.print_system_id || false,
      selectedSize: template.page_dimensions ? { id: template.page_dimensions, name: template.page_dimensions, width: 0, height: 0 } : null,
      currentStep: 2, // Direct to design studio step!
    }));

    try {
      const catalogUrl = legacyApiUrl('/api/catalog');
      const response = await fetch(catalogUrl);
      const apis = await response.json();
      if (Array.isArray(apis)) {
        const matchingApi = apis.find(api => api.name === template.context);
        if (matchingApi) {
          const resolvedContext = {
            id: `api-${matchingApi.id}`,
            name: matchingApi.name,
            isOData: !!(matchingApi.entities && Array.isArray(matchingApi.entities) && matchingApi.entities.length > 0),
            entities: matchingApi.entities || [],
            fields: matchingApi.fields || {},
            output_fields: Array.isArray(matchingApi.output_fields) ? matchingApi.output_fields : [],
          };
          setState(prev => ({
            ...prev,
            selectedContext: resolvedContext
          }));
          console.log("[WizardContext] Successfully loaded and resolved full OData context for editing:", matchingApi.name);
        }
      }
    } catch (err) {
      console.error("[WizardContext] Error fetching catalog for editing template:", err);
    }
  };

  const reset = () => setState(initialState);

  return (
    <WizardContext.Provider value={{ ...state, setStep, nextStep, prevStep, setUploadedFile, setUploadedImage, setAnnotatedImage, setCleanImage, setAnalysisResults, setChunks, addChunk, updateChunk, removeChunk, setSelectedContext, setSelectedSize, setLabelName, setOutputMode, setWatermarkName, setPrintSystemId, setModifiedLabelBlob, setGeneratedZPL, setGeneratedHTML, setGeneratedXDP, reset, loadSavedTemplate, setLabelId }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) throw new Error('useWizard must be used within WizardProvider');
  return context;
}
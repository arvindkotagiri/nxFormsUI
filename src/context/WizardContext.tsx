import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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
  chunks: LabelChunk[];
  selectedContext: any | null;
  selectedSize: LabelSize | null;
  labelName: string;
  outputMode: OutputMode; // New State
  modifiedLabelBlob: Blob | null; // Captured from Step 3
  generatedZPL: string | null;
  generatedHTML: string | null;
  generatedXDP: string | null;
  lastAnalyzedFile: string | null; // Name + Size + Type
}

interface WizardContextType extends WizardState {
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setUploadedFile: (file: File | null) => void;
  setUploadedImage: (image: string | null) => void;
  setAnnotatedImage: (image: string | null) => void;
  setCleanImage: (image: string | null) => void;
  setAnalysisResults: (fields: any[], annotatedImg: string, cleanImg?: string) => void;
  setChunks: (chunks: LabelChunk[]) => void;
  addChunk: (chunk: LabelChunk) => void;
  updateChunk: (id: string, updates: Partial<LabelChunk>) => void;
  removeChunk: (id: string) => void;
  setSelectedContext: (context: any | null) => void;
  setSelectedSize: (size: LabelSize | null) => void;
  setLabelName: (name: string) => void;
  setOutputMode: (mode: OutputMode) => void; // New Action
  setModifiedLabelBlob: (blob: Blob | null) => void;
  setGeneratedZPL: (zpl: string | null) => void;
  setGeneratedHTML: (html: string | null) => void;
  setGeneratedXDP: (xdp: string | null) => void;
  reset: () => void;
}

const initialState: WizardState = {
  currentStep: 1,
  uploadedFile: null,
  uploadedImage: null,
  cleanImage: null,
  annotatedImage: null,
  chunks: [],
  selectedContext: null,
  selectedSize: null,
  labelName: '',
  outputMode: 'all', // Default to all
  modifiedLabelBlob: null,
  generatedZPL: null,
  generatedHTML: null,
  generatedXDP: null,
  lastAnalyzedFile: null,
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);

  const setStep = (step: WizardStep) => setState(prev => ({ ...prev, currentStep: step }));
  const nextStep = () => setState(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, 5) as WizardStep }));
  const prevStep = () => setState(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 1) as WizardStep }));

  const setUploadedFile = (file: File | null) => setState(prev => ({ ...prev, uploadedFile: file }));
  const setUploadedImage = (image: string | null) => setState(prev => ({ ...prev, uploadedImage: image }));
  const setAnnotatedImage = (image: string | null) => setState(prev => ({ ...prev, annotatedImage: image }));
  const setCleanImage = (image: string | null) => setState(prev => ({ ...prev, cleanImage: image }));

  const setAnalysisResults = useCallback((fields: any[], annotatedImg: string, cleanImg?: string) => {
    if (!Array.isArray(fields)) {
      console.warn("setAnalysisResults: fields is not an array", fields);
      return;
    }
    const mappedChunks: LabelChunk[] = fields.map((field, index) => {
      // Safety check for box_2d
      const box = Array.isArray(field.box_2d) && field.box_2d.length === 4 
        ? field.box_2d 
        : [0, 0, 0, 0];
        
      const [ymin, xmin, ymax, xmax] = box;
      const isTable = field.content_type === 'table';
      
      return {
        id: `chunk-${index}-${Date.now()}`,
        type: isTable ? 'table' : (field.content_type === 'barcode' ? 'barcode' : (field.content_type === 'table_cell' ? 'table_cell' : (field.content_type === 'logo' ? 'logo' : (field.content_type === 'signature' ? 'signature' : 'text')))),
        x: xmin / 10,
        y: ymin / 10,
        width: (xmax - xmin) / 10,
        height: (ymax - ymin) / 10,
        label: field.field_name || `field_${index}`,
        value: field.value || "",
        isStatic: field.category === 'static',
        barcodeType: field.content_type === 'barcode' ? 'code128' : undefined,
        transformations: [],
        rows: isTable ? field.table_data : undefined,
        isDynamicTable: isTable,
        cropped_b64: field.cropped_b64,
      };
    });
    setState(prev => {
      const fileSignature = prev.uploadedFile ? `${prev.uploadedFile.name}-${prev.uploadedFile.size}-${prev.uploadedFile.lastModified}` : null;
      return { 
        ...prev, 
        chunks: mappedChunks, 
        annotatedImage: annotatedImg, 
        cleanImage: cleanImg || null,
        lastAnalyzedFile: fileSignature
      };
    });
  }, []);

  const setChunks = (chunks: LabelChunk[]) => setState(prev => ({ ...prev, chunks }));
  const addChunk = (chunk: LabelChunk) => setState(prev => ({ ...prev, chunks: [...prev.chunks, chunk] }));
  const updateChunk = (id: string, updates: Partial<LabelChunk>) => {
    setState(prev => ({ ...prev, chunks: prev.chunks.map(c => (c.id === id ? { ...c, ...updates } : c)) }));
  };
  const removeChunk = (id: string) => setState(prev => ({ ...prev, chunks: prev.chunks.filter(c => c.id !== id) }));

  const setSelectedContext = (context: any | null) => setState(prev => ({ ...prev, selectedContext: context }));
  const setSelectedSize = (size: LabelSize | null) => setState(prev => ({ ...prev, selectedSize: size }));
  const setLabelName = (name: string) => setState(prev => ({ ...prev, labelName: name }));
  const setOutputMode = (mode: OutputMode) => setState(prev => ({ ...prev, outputMode: mode }));

  const setModifiedLabelBlob = (blob: Blob | null) => setState(prev => ({ ...prev, modifiedLabelBlob: blob }));

  const setGeneratedZPL = (zpl: string | null) => setState(prev => ({ ...prev, generatedZPL: zpl }));
  const setGeneratedHTML = (html: string | null) => setState(prev => ({ ...prev, generatedHTML: html }));
  const setGeneratedXDP = (xdp: string | null) => setState(prev => ({ ...prev, generatedXDP: xdp }));

  const reset = () => setState(initialState);

  return (
    <WizardContext.Provider value={{ ...state, setStep, nextStep, prevStep, setUploadedFile, setUploadedImage, setAnnotatedImage, setCleanImage, setAnalysisResults, setChunks, addChunk, updateChunk, removeChunk, setSelectedContext, setSelectedSize, setLabelName, setOutputMode, setModifiedLabelBlob, setGeneratedZPL, setGeneratedHTML, setGeneratedXDP, reset }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) throw new Error('useWizard must be used within WizardProvider');
  return context;
}
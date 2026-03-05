import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type LabelChunk = {
  id: string;
  type: 'text' | 'barcode' | 'table_cell';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value?: string;
  isStatic: boolean;
  fieldMapping?: string;
  barcodeType?: 'code128' | 'code39' | 'itf14' | 'qr';
};

export type LabelSize = {
  id: string;
  name: string;
  width: number;
  height: number;
};

// Added 'zpl', 'html', or 'both' as valid output modes
export type OutputMode = 'zpl' | 'html' | 'both';
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
  outputMode: 'both', // Default
  modifiedLabelBlob: null,
  generatedZPL: null,
  generatedHTML: null,
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
    const mappedChunks: LabelChunk[] = fields.map((field, index) => {
      const [ymin, xmin, ymax, xmax] = field.box_2d;
      return {
        id: `chunk-${index}-${Date.now()}`,
        type: field.content_type === 'barcode' ? 'barcode' : (field.content_type === 'table_cell' ? 'table_cell' : 'text'),
        x: xmin / 10,
        y: ymin / 10,
        width: (xmax - xmin) / 10,
        height: (ymax - ymin) / 10,
        label: field.field_name,
        value: field.value,
        isStatic: field.category === 'static',
        barcodeType: field.content_type === 'barcode' ? 'code128' : undefined
      };
    });
    setState(prev => ({ ...prev, chunks: mappedChunks, annotatedImage: annotatedImg, cleanImage: cleanImg || null }));
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

  const reset = () => setState(initialState);

  return (
    <WizardContext.Provider value={{ ...state, setStep, nextStep, prevStep, setUploadedFile, setUploadedImage, setAnnotatedImage, setCleanImage, setAnalysisResults, setChunks, addChunk, updateChunk, removeChunk, setSelectedContext, setSelectedSize, setLabelName, setOutputMode, setModifiedLabelBlob, setGeneratedZPL, setGeneratedHTML, reset }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) throw new Error('useWizard must be used within WizardProvider');
  return context;
}
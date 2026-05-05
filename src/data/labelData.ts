import { LabelContext, LabelSize } from '@/context/WizardContext';

export const BUSINESS_CONTEXTS: LabelContext[] = [];

export const LABEL_SIZES: LabelSize[] = [
  { id: '4x6', name: '4" × 6"', width: 4, height: 6 },
  { id: '4x8', name: '4" × 8"', width: 4, height: 8 },
  { id: '2x4', name: '2" × 4"', width: 2, height: 4 },
  { id: '4x3', name: '4" × 3"', width: 4, height: 3 },
  { id: 'a4', name: 'A4', width: 8.3, height: 11.7 },
  { id: 'a3', name: 'A3', width: 11.7, height: 16.5 },
  { id: 'general', name: 'General Sized', width: 8.5, height: 11 },
];

export const BARCODE_TYPES = [
  { id: 'code128', name: 'Code 128', description: 'Most flexible, alphanumeric' },
  { id: 'code39', name: 'Code 39', description: 'Legacy systems, alphanumeric' },
  { id: 'itf14', name: 'ITF-14', description: 'Logistics & cartons, numeric' },
  { id: 'qr', name: 'QR Code', description: '2D, high data capacity' },
] as const;

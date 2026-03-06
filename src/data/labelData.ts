import { LabelContext, LabelSize } from '@/context/WizardContext';

export const BUSINESS_CONTEXTS: LabelContext[] = [
  {
    id: 'outbound-delivery',
    name: 'Outbound Delivery',
    entity: 'Delivery',
    fields: [
      { name: 'Delivery Number', type: 'string', path: 'Delivery.Number' },
      { name: 'Ship-To Name', type: 'string', path: 'Delivery.ShipToName' },
      { name: 'Ship-To Address', type: 'string', path: 'Delivery.ShipToAddress' },
      { name: 'Ship-To City', type: 'string', path: 'Delivery.ShipToCity' },
      { name: 'Ship-To Postal Code', type: 'string', path: 'Delivery.ShipToPostal' },
      { name: 'Ship-From Name', type: 'string', path: 'Delivery.ShipFromName' },
      { name: 'Ship-From Address', type: 'string', path: 'Delivery.ShipFromAddress' },
      { name: 'Purchase Order', type: 'string', path: 'Delivery.PurchaseOrder' },
      { name: 'Carrier Code', type: 'string', path: 'Delivery.CarrierCode' },
      { name: 'PRO Number', type: 'string', path: 'Delivery.PRONumber' },
      { name: 'Bill of Lading', type: 'string', path: 'Delivery.BillOfLading' },
    ],
  },
  {
    id: 'handling-unit',
    name: 'Handling Unit (HU)',
    entity: 'HU',
    fields: [
      { name: 'HU Number', type: 'string', path: 'HU.Number' },
      { name: 'SSCC-18', type: 'barcode', path: 'HU.SSCC18' },
      { name: 'Pallet ID', type: 'string', path: 'HU.PalletID' },
      { name: 'Weight', type: 'number', path: 'HU.Weight' },
      { name: 'Contents', type: 'string', path: 'HU.Contents' },
    ],
  },
  {
    id: 'warehouse-order',
    name: 'Warehouse Order',
    entity: 'WarehouseOrder',
    fields: [
      { name: 'Order Number', type: 'string', path: 'WarehouseOrder.Number' },
      { name: 'Source Bin', type: 'string', path: 'WarehouseOrder.SourceBin' },
      { name: 'Destination Bin', type: 'string', path: 'WarehouseOrder.DestBin' },
      { name: 'Product', type: 'string', path: 'WarehouseOrder.Product' },
      { name: 'Quantity', type: 'number', path: 'WarehouseOrder.Quantity' },
    ],
  },
  {
    id: 'shipment',
    name: 'Shipment',
    entity: 'Shipment',
    fields: [
      { name: 'Shipment ID', type: 'string', path: 'Shipment.ID' },
      { name: 'Carrier', type: 'string', path: 'Shipment.Carrier' },
      { name: 'Tracking Number', type: 'barcode', path: 'Shipment.TrackingNumber' },
      { name: 'Ship Date', type: 'date', path: 'Shipment.ShipDate' },
      { name: 'Service Level', type: 'string', path: 'Shipment.ServiceLevel' },
    ],
  },
  {
    id: 'cheques',
    name: 'Cheques',
    entity: 'Cheque',
    fields: [
      { name: 'Vendor Number', type: 'string', path: 'Cheque.VendorNumber' },
      { name: 'Vendor Name', type: 'date', path: 'Cheque.VendorName' },
      { name: 'Vendor Address 1', type: 'string', path: 'Cheque.VendorAddress1' },
      { name: 'Vendor Address 2', type: 'number', path: 'Cheque.VendorAddress2' },
      { name: 'Vendor City', type: 'number', path: 'Cheque.VendorCity' },
      { name: 'Vendor State', type: 'number', path: 'Cheque.VendorState' },
      { name: 'Vendor ZIP', type: 'number', path: 'Cheque.VendorZIP' },
      { name: 'Check Number', type: 'number', path: 'Cheque.CheckNumber' },
      { name: 'Check Date', type: 'number', path: 'Cheque.CheckDate' },
      { name: 'Amount', type: 'number', path: 'Cheque.Amount' },
      { name: 'Amount in words', type: 'number', path: 'Cheque.AmountInWords' },
      { name: 'Invoice Number', type: 'number', path: 'Cheque.InvoiceNumber' },
      { name: 'Invoice Date', type: 'number', path: 'Cheque.InvoiceDate' },
      { name: 'Voucher ID', type: 'number', path: 'Cheque.VoucherID' },
      { name: 'Gross Amount', type: 'number', path: 'Cheque.GrossAmount' },
      { name: 'Discount', type: 'number', path: 'Cheque.Discount' },
      { name: 'Net Amount', type: 'number', path: 'Cheque.NetAmount' },
    ],
  },
  {
    id: 'payment-advice',
    name: 'Payment Advice',
    entity: 'PaymentAdvice',
    fields: [
      { name: 'Invoice Number', type: 'string', path: 'PaymentAdvice.InvoiceNumber' },
      { name: 'Invoice Date', type: 'date', path: 'PaymentAdvice.InvoiceDate' },
      { name: 'Voucher ID', type: 'string', path: 'PaymentAdvice.VoucherID' },
      { name: 'Gross Amount', type: 'number', path: 'PaymentAdvice.GrossAmount' },
      { name: 'Discount Taken', type: 'number', path: 'PaymentAdvice.DiscountTaken' },
      { name: 'Paid Amount', type: 'number', path: 'PaymentAdvice.PaidAmount' },
    ],
  },
];

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

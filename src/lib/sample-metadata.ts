// Realistic SAP S/4HANA OData metadata sample
export type ODataField = {
  name: string;
  label: string;
  description: string;
  type: string;
  isKey: boolean;
  recommended: boolean;
  hasValueHelp?: boolean;
  sample: string | number;
};

export type ODataEntity = {
  name: string;
  label: string;
  description: string;
  isCore: boolean;
  relationships: string[];
  fields: ODataField[];
};

export const SAMPLE_ENTITIES: ODataEntity[] = [
  {
    name: "A_BusinessPartner",
    label: "Business Partner",
    description: "Customers, suppliers, and contacts master data",
    isCore: true,
    relationships: ["A_Customer", "A_Supplier", "A_BusinessPartnerAddress"],
    fields: [
      { name: "BusinessPartner", label: "Business Partner ID", description: "Unique partner identifier", type: "Edm.String", isKey: true, recommended: true, sample: "1000123" },
      { name: "BusinessPartnerFullName", label: "Full Name", description: "Complete name of the business partner", type: "Edm.String", isKey: false, recommended: true, sample: "Acme Industries GmbH" },
      { name: "BusinessPartnerCategory", label: "Category", description: "Person, organization, or group", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "Organization" },
      { name: "BusinessPartnerGrouping", label: "Grouping", description: "Classification grouping for the partner", type: "Edm.String", isKey: false, recommended: false, hasValueHelp: true, sample: "BP01" },
      { name: "CreationDate", label: "Created On", description: "Date the record was created", type: "Edm.DateTime", isKey: false, recommended: true, sample: "2024-03-12" },
      { name: "LastChangeDate", label: "Last Modified", description: "Most recent change timestamp", type: "Edm.DateTime", isKey: false, recommended: false, sample: "2024-09-04" },
      { name: "IsBlocked", label: "Blocked", description: "Whether the partner is blocked from transactions", type: "Edm.Boolean", isKey: false, recommended: false, sample: "false" },
      { name: "Industry", label: "Industry", description: "Primary industry classification", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "Manufacturing" },
    ],
  },
  {
    name: "A_SalesOrder",
    label: "Sales Order",
    description: "Sales order header information",
    isCore: true,
    relationships: ["A_SalesOrderItem", "A_BusinessPartner"],
    fields: [
      { name: "SalesOrder", label: "Sales Order", description: "Unique sales order number", type: "Edm.String", isKey: true, recommended: true, sample: "5000001234" },
      { name: "SalesOrderType", label: "Order Type", description: "Document type of the sales order", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "OR" },
      { name: "SalesOrganization", label: "Sales Organization", description: "Sales org that processes the order", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "1710" },
      { name: "SoldToParty", label: "Sold-To Party", description: "Customer who placed the order", type: "Edm.String", isKey: false, recommended: true, sample: "1000123" },
      { name: "TotalNetAmount", label: "Net Amount", description: "Total net value of the order", type: "Edm.Decimal", isKey: false, recommended: true, sample: 24890.5 },
      { name: "TransactionCurrency", label: "Currency", description: "ISO currency code", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "EUR" },
      { name: "CreationDate", label: "Order Date", description: "Date the order was created", type: "Edm.DateTime", isKey: false, recommended: true, sample: "2024-09-18" },
      { name: "OverallSDProcessStatus", label: "Status", description: "Overall processing status", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "In Process" },
    ],
  },
  {
    name: "A_SalesOrderItem",
    label: "Sales Order Item",
    description: "Line items belonging to a sales order",
    isCore: true,
    relationships: ["A_SalesOrder", "A_Product"],
    fields: [
      { name: "SalesOrder", label: "Sales Order", description: "Parent sales order number", type: "Edm.String", isKey: true, recommended: true, sample: "5000001234" },
      { name: "SalesOrderItem", label: "Item Number", description: "Line item position", type: "Edm.String", isKey: true, recommended: true, sample: "10" },
      { name: "Material", label: "Material", description: "Product or material number", type: "Edm.String", isKey: false, recommended: true, sample: "MZ-FG-A100" },
      { name: "RequestedQuantity", label: "Quantity", description: "Quantity requested by the customer", type: "Edm.Decimal", isKey: false, recommended: true, sample: 12 },
      { name: "RequestedQuantityUnit", label: "Unit", description: "Unit of measure", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "EA" },
      { name: "NetAmount", label: "Net Amount", description: "Net value for the line item", type: "Edm.Decimal", isKey: false, recommended: true, sample: 2073.0 },
      { name: "Plant", label: "Plant", description: "Delivering plant", type: "Edm.String", isKey: false, recommended: false, hasValueHelp: true, sample: "1710" },
    ],
  },
  {
    name: "A_Product",
    label: "Product",
    description: "Material master records",
    isCore: true,
    relationships: ["A_ProductDescription", "A_ProductPlant"],
    fields: [
      { name: "Product", label: "Product", description: "Unique product / material number", type: "Edm.String", isKey: true, recommended: true, sample: "MZ-FG-A100" },
      { name: "ProductType", label: "Product Type", description: "Type classification of the product", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "FERT" },
      { name: "ProductGroup", label: "Product Group", description: "Logical grouping for products", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "L001" },
      { name: "BaseUnit", label: "Base Unit", description: "Base unit of measure", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "EA" },
      { name: "GrossWeight", label: "Gross Weight", description: "Gross weight of the product", type: "Edm.Decimal", isKey: false, recommended: false, sample: 1.45 },
      { name: "WeightUnit", label: "Weight Unit", description: "Unit of measure for weight", type: "Edm.String", isKey: false, recommended: false, hasValueHelp: true, sample: "KG" },
    ],
  },
  {
    name: "A_Customer",
    label: "Customer",
    description: "Customer-specific master data extension",
    isCore: false,
    relationships: ["A_BusinessPartner"],
    fields: [
      { name: "Customer", label: "Customer", description: "Unique customer number", type: "Edm.String", isKey: true, recommended: true, sample: "1000123" },
      { name: "CustomerAccountGroup", label: "Account Group", description: "Customer account group", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "Z001" },
      { name: "CustomerClassification", label: "Classification", description: "ABC classification of customer", type: "Edm.String", isKey: false, recommended: false, hasValueHelp: true, sample: "A" },
    ],
  },
  {
    name: "A_Supplier",
    label: "Supplier",
    description: "Supplier-specific master data extension",
    isCore: false,
    relationships: ["A_BusinessPartner"],
    fields: [
      { name: "Supplier", label: "Supplier", description: "Unique supplier number", type: "Edm.String", isKey: true, recommended: true, sample: "200056" },
      { name: "SupplierAccountGroup", label: "Account Group", description: "Supplier account group", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "ZSUP" },
      { name: "PaymentTerms", label: "Payment Terms", description: "Default payment terms code", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "NT30" },
    ],
  },
  {
    name: "A_BillingDocument",
    label: "Billing Document",
    description: "Customer invoices and credit memos",
    isCore: false,
    relationships: ["A_SalesOrder", "A_BusinessPartner"],
    fields: [
      { name: "BillingDocument", label: "Billing Document", description: "Unique invoice number", type: "Edm.String", isKey: true, recommended: true, sample: "9000003456" },
      { name: "BillingDocumentType", label: "Document Type", description: "Invoice / credit memo type", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "F2" },
      { name: "TotalNetAmount", label: "Net Amount", description: "Total net value invoiced", type: "Edm.Decimal", isKey: false, recommended: true, sample: 24890.5 },
      { name: "BillingDocumentDate", label: "Invoice Date", description: "Date of the invoice", type: "Edm.DateTime", isKey: false, recommended: true, sample: "2024-09-22" },
    ],
  },
  {
    name: "A_PurchaseOrder",
    label: "Purchase Order",
    description: "Procurement purchase orders",
    isCore: false,
    relationships: ["A_Supplier", "A_PurchaseOrderItem"],
    fields: [
      { name: "PurchaseOrder", label: "Purchase Order", description: "Unique PO number", type: "Edm.String", isKey: true, recommended: true, sample: "4500001122" },
      { name: "Supplier", label: "Supplier", description: "Supplier of the PO", type: "Edm.String", isKey: false, recommended: true, sample: "200056" },
      { name: "PurchaseOrderDate", label: "PO Date", description: "Date the PO was created", type: "Edm.DateTime", isKey: false, recommended: true, sample: "2024-09-10" },
      { name: "DocumentCurrency", label: "Currency", description: "ISO currency code", type: "Edm.String", isKey: false, recommended: true, hasValueHelp: true, sample: "EUR" },
    ],
  },
];

export function buildPreviewRows(entity: ODataEntity, count = 5) {
  const rows: Record<string, string | number>[] = [];
  for (let i = 0; i < count; i++) {
    const row: Record<string, string | number> = {};
    entity.fields.forEach((f) => {
      if (typeof f.sample === "number") {
        row[f.name] = +(Number(f.sample) * (1 + i * 0.07)).toFixed(2);
      } else if (f.type === "Edm.DateTime") {
        const d = new Date();
        d.setDate(d.getDate() - i * 3);
        row[f.name] = d.toISOString().slice(0, 10);
      } else if (f.isKey) {
        const base = String(f.sample);
        row[f.name] = base.replace(/(\d+)$/, (m) => String(Number(m) + i));
      } else {
        row[f.name] = String(f.sample);
      }
    });
    rows.push(row);
  }
  return rows;
}

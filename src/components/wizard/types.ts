export type Environment = "S4Hana" | "ECC" | "NetSuite";

export interface ContextConfig {
  name: string;
  description: string;
  application: string;  // add
  environment: string;  // updated (was Environment enum)
  client: string;       // add
}

export type ConnectionConfig = {
  baseUrl: string;
  authType: "OAuth2" | "Basic" | "None";
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
};

export type EntityConfig = {
  enabled: boolean;
  label: string;
  description: string;
  originalName: string;
  fieldCount: number;
  keyCount: number;
  isCore?: boolean;
  relationships?: string[];
};

export type FieldConfig = {
  enabled: boolean;
  label: string;
  description: string;
  originalName: string;
  type: string;
  isKey: boolean;
  hasValueHelp?: boolean;
  sample?: any;
};

export type WizardState = {
  step: number;
  context: ContextConfig;
  connection: ConnectionConfig;
  entities: Record<string, EntityConfig>;
  fields: Record<string, Record<string, FieldConfig>>; // entity -> field -> config
};

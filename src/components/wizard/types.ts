export type Environment = "dev" | "qa" | "prod";

export type ContextConfig = {
  name: string;
  description: string;
  environment: Environment;
};

export type ConnectionConfig = {
  baseUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
};

export type EntityConfig = {
  enabled: boolean;
  label: string;
  description: string;
};

export type FieldConfig = {
  enabled: boolean;
  label: string;
  description: string;
};

export type WizardState = {
  step: number;
  context: ContextConfig;
  connection: ConnectionConfig;
  entities: Record<string, EntityConfig>;
  fields: Record<string, Record<string, FieldConfig>>; // entity -> field -> config
};

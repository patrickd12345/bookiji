export interface MigrationRule {
  from: string;
  to: string;
  required: boolean;
  description?: string;
}

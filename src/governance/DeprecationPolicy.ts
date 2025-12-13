export interface DeprecationPolicy {
  domain: string;
  willDeprecate: boolean;
  sunsetDate?: string;
  replacement?: string;
}

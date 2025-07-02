export * from './global.d';

export type Theme = 'light' | 'dark' | 'pastel' | 'cyberpunk' | 'candycrush';

export interface ThemeConfig {
  name: Theme;
  label: string;
  icon: string;
  class: string;
}

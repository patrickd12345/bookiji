export * from './global.d';

export type Theme = 'light' | 'dark' | 'pastel' | 'nord' | 'cyberpunk'

export interface ThemeConfig {
  name: Theme
  label: string
  preview: {
    background: string
    text: string
    accent: string
  }
}

export const theme = {
  colors: {
    // Brand Colors
    primary: {
      gradient: 'bg-gradient-to-r from-blue-600 to-purple-600',
    },
    background: {
      gradient: 'bg-gradient-to-b from-gray-50 to-white',
    },
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      muted: 'text-gray-400',
    },
    input: {
      background: 'bg-gray-100',
      text: 'text-gray-900',
      placeholder: 'placeholder-gray-400',
      focus: 'focus:ring-blue-500',
    },
  },
  
  // Typography
  typography: {
    heading: {
      font: 'font-extrabold',
      gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent',
    },
    body: {
      font: 'font-normal',
      color: 'text-gray-600',
    },
  },

  // Component Styles
  components: {
    card: {
      background: 'bg-white',
      border: 'border border-gray-100',
      shadow: 'shadow-sm',
      rounded: 'rounded-2xl',
      hover: 'hover:shadow-xl transition-shadow duration-300',
    },
    button: {
      primary: {
        base: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
        hover: 'hover:opacity-90 transition-opacity',
        shadow: 'shadow-lg shadow-blue-500/20',
        rounded: 'rounded-xl',
      },
      secondary: {
        base: 'bg-white text-gray-700 border border-gray-200',
        hover: 'hover:bg-gray-50 transition-colors',
        shadow: 'shadow-sm',
        rounded: 'rounded-xl',
      },
    },
    input: {
      base: 'w-full px-4 py-3 bg-gray-100 border-0',
      focus: 'focus:ring-2 focus:ring-blue-500',
      rounded: 'rounded-xl',
      placeholder: 'placeholder-gray-400',
    },
  },

  // Animation
  animation: {
    hover: 'transition-all duration-300 ease-in-out',
    fade: 'transition-opacity duration-300 ease-in-out',
    slide: 'transition-transform duration-300 ease-in-out',
  },
} as const;

// Type for theme-aware components
export type Theme = typeof theme;

// Helper to combine theme classes
export const combineClasses = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

// Type-safe theme path accessor
type DotNotation<T> = T extends object
  ? { [K in keyof T]: `${K & string}${'' | `.${DotNotation<T[K]>}`}` }[keyof T]
  : never;

type ThemePath = DotNotation<Theme>;

// Utility function to get theme values
export const getThemeValue = (
  path: ThemePath,
  defaultValue?: string
): string | undefined => {
  return (
    path
      .split('.')
      .reduce<unknown>((obj, key) => {
        if (obj && typeof obj === 'object') {
          return (obj as Record<string, unknown>)[key]
        }
        return undefined
      }, theme) ?? defaultValue
  )
};

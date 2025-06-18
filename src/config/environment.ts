// Environment configuration for Bookiji
// Handles both development (local LLM) and production (Railway LLM)

export interface EnvironmentConfig {
  // LLM Configuration
  llm: {
    baseURL: string;
    model: string;
    apiKey?: string;
    timeout: number;
  };
  
  // Database Configuration
  database: {
    url: string;
    type: 'postgresql';
  };
  
  // Authentication
  auth: {
    secret: string;
    providers: {
      google?: {
        clientId: string;
        clientSecret: string;
      };
      github?: {
        clientId: string;
        clientSecret: string;
      };
    };
  };
  
  // External APIs
  apis: {
    mapbox: {
      accessToken: string;
    };
    stripe: {
      publishableKey: string;
      secretKey: string;
      webhookSecret: string;
    };
  };
  
  // App Configuration
  app: {
    url: string;
    environment: 'development' | 'production' | 'staging';
    debug: boolean;
  };
}

// Development configuration (local)
const developmentConfig: EnvironmentConfig = {
  llm: {
    baseURL: process.env.LOCAL_LLM_URL || 'http://localhost:11434',
    model: process.env.LOCAL_LLM_MODEL || 'llama3.2:8b',
    timeout: 30000, // 30 seconds for local
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/bookiji_dev',
    type: 'postgresql',
  },
  
  auth: {
    secret: process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-in-production',
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      },
    },
  },
  
  apis: {
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
    },
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
  },
  
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    environment: 'development',
    debug: true,
  },
};

// Production configuration (Railway)
const productionConfig: EnvironmentConfig = {
  llm: {
    baseURL: process.env.RAILWAY_LLM_URL || process.env.LLM_URL || '',
    model: process.env.RAILWAY_LLM_MODEL || process.env.LLM_MODEL || 'llama3.2:8b',
    timeout: 60000, // 60 seconds for production
  },
  
  database: {
    url: process.env.DATABASE_URL || '',
    type: 'postgresql',
  },
  
  auth: {
    secret: process.env.NEXTAUTH_SECRET || '',
    providers: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      },
    },
  },
  
  apis: {
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
    },
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
  },
  
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '',
    environment: 'production',
    debug: false,
  },
};

// Staging configuration (for testing)
const stagingConfig: EnvironmentConfig = {
  ...productionConfig,
  app: {
    ...productionConfig.app,
    environment: 'staging',
    debug: true,
  },
};

// Determine which configuration to use
const getEnvironmentConfig = (): EnvironmentConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const deployEnv = process.env.DEPLOY_ENV;
  
  // Check for staging first
  if (deployEnv === 'staging') {
    return stagingConfig;
  }
  
  // Then fall back to NODE_ENV
  if (nodeEnv === 'production') {
    return productionConfig;
  }
  
  // Default to development
  return developmentConfig;
};

// Export the configuration
export const config = getEnvironmentConfig();

// Helper functions for environment-specific logic
export const isDevelopment = () => config.app.environment === 'development';
export const isProduction = () => config.app.environment === 'production';
export const isStaging = () => config.app.environment === 'staging';

// LLM client configuration
export const getLLMConfig = () => ({
  baseURL: config.llm.baseURL,
  model: config.llm.model,
  timeout: config.llm.timeout,
});

// Database configuration
export const getDatabaseConfig = () => ({
  url: config.database.url,
  type: config.database.type,
});

// Validation function to ensure all required environment variables are set
export const validateEnvironment = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check LLM configuration
  if (!config.llm.baseURL) {
    errors.push('LLM baseURL is not configured');
  }
  
  // Check database configuration
  if (!config.database.url) {
    errors.push('Database URL is not configured');
  }
  
  // Check authentication
  if (!config.auth.secret) {
    errors.push('NextAuth secret is not configured');
  }
  
  // Check required APIs for production
  if (isProduction()) {
    if (!config.apis.mapbox.accessToken) {
      errors.push('Mapbox access token is not configured');
    }
    if (!config.apis.stripe.publishableKey) {
      errors.push('Stripe publishable key is not configured');
    }
    if (!config.apis.stripe.secretKey) {
      errors.push('Stripe secret key is not configured');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Environment-specific logging
export const logEnvironmentInfo = () => {
  if (isDevelopment()) {
    console.log('🚀 Bookiji Development Environment');
    console.log(`📡 LLM URL: ${config.llm.baseURL}`);
    console.log(`🗄️  Database: ${config.database.url ? 'Configured' : 'Not configured'}`);
    console.log(`🔐 Auth: ${config.auth.secret ? 'Configured' : 'Not configured'}`);
  } else {
    console.log('🚀 Bookiji Production Environment');
    console.log(`📡 LLM URL: ${config.llm.baseURL ? 'Configured' : 'Not configured'}`);
    console.log(`🗄️  Database: ${config.database.url ? 'Configured' : 'Not configured'}`);
    console.log(`🔐 Auth: ${config.auth.secret ? 'Configured' : 'Not configured'}`);
  }
};

export default config; 
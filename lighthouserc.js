module.exports = {
  ci: {
    collect: {
      url: process.env.LHCI_COLLECT_URL ? [process.env.LHCI_COLLECT_URL] : ['https://www.bookiji.com/'],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance Budgets
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // LCP < 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // CLS < 0.1
        'interactive': ['error', { maxNumericValue: 2500 }], // TTI < 2.5s
        'total-byte-weight': ['error', { maxNumericValue: 180000 }], // JS bundle < 180kb (approximate)
        'unused-javascript': ['warn', { maxNumericValue: 180000 }],
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }],
        
        // Additional performance checks
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}

// Validation is handled in mapGeminiPlanToRunner
// This file exists for compatibility but validation happens during mapping
export function validatePlan(plan, capabilities, invariantGlossary) {
  // Validation is done in mapGeminiPlanToRunner
  // This is a no-op for now but can be extended
  if (plan.error) {
    return // Error plans are valid error responses
  }
  
  if (!plan.capabilityId) {
    throw new Error('Plan missing capabilityId')
  }
  
  if (!plan.iterations || plan.iterations < 1) {
    throw new Error('Plan missing or invalid iterations')
  }
  
  return true
}


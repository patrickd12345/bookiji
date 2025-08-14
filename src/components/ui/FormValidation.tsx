'use client'

import { useState, useEffect, useCallback } from 'react'
import { ValidationError } from './ErrorDisplay'
import { cn } from '@/lib/utils'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
  email?: boolean
  phone?: boolean
  url?: boolean
  numeric?: boolean
  positive?: boolean
  futureDate?: boolean
  pastDate?: boolean
  minValue?: number
  maxValue?: number
  matches?: {
    field: string
    message: string
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface FieldValidation {
  value: any
  rules: ValidationRule
  touched: boolean
  errors: string[]
}

export interface FormValidation {
  [fieldName: string]: FieldValidation
}

// Built-in validation rules
export const validationRules = {
  required: (value: any): string | null => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required'
    }
    return null
  },

  minLength: (value: any, min: number): string | null => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters`
    }
    return null
  },

  maxLength: (value: any, max: number): string | null => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters`
    }
    return null
  },

  pattern: (value: any, pattern: RegExp): string | null => {
    if (value && !pattern.test(value)) {
      return 'Invalid format'
    }
    return null
  },

  email: (value: any): string | null => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Invalid email address'
    }
    return null
  },

  phone: (value: any): string | null => {
    if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return 'Invalid phone number'
    }
    return null
  },

  url: (value: any): string | null => {
    if (value && !/^https?:\/\/.+/.test(value)) {
      return 'Invalid URL'
    }
    return null
  },

  numeric: (value: any): string | null => {
    if (value && isNaN(Number(value))) {
      return 'Must be a number'
    }
    return null
  },

  positive: (value: any): string | null => {
    if (value && Number(value) <= 0) {
      return 'Must be a positive number'
    }
    return null
  },

  futureDate: (value: any): string | null => {
    if (value && new Date(value) <= new Date()) {
      return 'Must be a future date'
    }
    return null
  },

  pastDate: (value: any): string | null => {
    if (value && new Date(value) >= new Date()) {
      return 'Must be a past date'
    }
    return null
  },

  minValue: (value: any, min: number): string | null => {
    if (value && Number(value) < min) {
      return `Must be at least ${min}`
    }
    return null
  },

  maxValue: (value: any, max: number): string | null => {
    if (value && Number(value) > max) {
      return `Must be no more than ${max}`
    }
    return null
  }
}

// Validate a single field
export function validateField(value: any, rules: ValidationRule): string[] {
  const errors: string[] = []

  // Required validation
  if (rules.required) {
    const requiredError = validationRules.required(value)
    if (requiredError) {
      errors.push(requiredError)
      return errors // Stop validation if required fails
    }
  }

  // Skip other validations if value is empty and not required
  if (!value && !rules.required) {
    return errors
  }

  // Length validations
  if (rules.minLength) {
    const minLengthError = validationRules.minLength(value, rules.minLength)
    if (minLengthError) errors.push(minLengthError)
  }

  if (rules.maxLength) {
    const maxLengthError = validationRules.maxLength(value, rules.maxLength)
    if (maxLengthError) errors.push(maxLengthError)
  }

  // Pattern validation
  if (rules.pattern) {
    const patternError = validationRules.pattern(value, rules.pattern)
    if (patternError) errors.push(patternError)
  }

  // Type validations
  if (rules.email) {
    const emailError = validationRules.email(value)
    if (emailError) errors.push(emailError)
  }

  if (rules.phone) {
    const phoneError = validationRules.phone(value)
    if (phoneError) errors.push(phoneError)
  }

  if (rules.url) {
    const urlError = validationRules.url(value)
    if (urlError) errors.push(urlError)
  }

  if (rules.numeric) {
    const numericError = validationRules.numeric(value)
    if (numericError) errors.push(numericError)
  }

  if (rules.positive) {
    const positiveError = validationRules.positive(value)
    if (positiveError) errors.push(positiveError)
  }

  // Date validations
  if (rules.futureDate) {
    const futureDateError = validationRules.futureDate(value)
    if (futureDateError) errors.push(futureDateError)
  }

  if (rules.pastDate) {
    const pastDateError = validationRules.pastDate(value)
    if (pastDateError) errors.push(pastDateError)
  }

  // Value range validations
  if (rules.minValue) {
    const minValueError = validationRules.minValue(value, rules.minValue)
    if (minValueError) errors.push(minValueError)
  }

  if (rules.maxValue) {
    const maxValueError = validationRules.maxValue(value, rules.maxValue)
    if (maxValueError) errors.push(maxValueError)
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value)
    if (customError) errors.push(customError)
  }

  return errors
}

// Hook for form validation
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationSchema: Record<keyof T, ValidationRule>,
  options?: {
    validateOnChange?: boolean
    validateOnBlur?: boolean
    validateOnSubmit?: boolean
  }
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true
  } = options || {}

  const [values, setValues] = useState<T>(initialValues)
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)
  const [errors, setErrors] = useState<Record<keyof T, string[]>>({} as Record<keyof T, string[]>)
  const [isValidating, setIsValidating] = useState(false)

  // Initialize validation state
  useEffect(() => {
    const initialTouched: Record<keyof T, boolean> = {} as Record<keyof T, boolean>
    const initialErrors: Record<keyof T, string[]> = {} as Record<keyof T, string[]>

    Object.keys(validationSchema).forEach((key) => {
      initialTouched[key as keyof T] = false
      initialErrors[key as keyof T] = []
    })

    setTouched(initialTouched)
    setErrors(initialErrors)
  }, [validationSchema])

  // Validate a single field
  const validateFieldLocal = useCallback((field: keyof T, value: any): string[] => {
    const fieldErrors = validateField(value, validationSchema[field])
    setErrors(prev => ({
      ...prev,
      [field]: fieldErrors
    }))
    return fieldErrors
  }, [validationSchema])

  // Validate all fields
  const validateForm = useCallback(async (): Promise<boolean> => {
    setIsValidating(true)
    
    try {
      const newErrors: Record<keyof T, string[]> = {} as Record<keyof T, string[]>
      let hasErrors = false

      Object.keys(validationSchema).forEach((key) => {
        const field = key as keyof T
        const fieldErrors = validateField(values[field], validationSchema[field])
        newErrors[field] = fieldErrors
        
        if (fieldErrors.length > 0) {
          hasErrors = true
        }
      })

      setErrors(newErrors)
      return !hasErrors
    } finally {
      setIsValidating(false)
    }
  }, [values, validationSchema])

  // Set field value
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    if (validateOnChange) {
      validateFieldLocal(field, value)
    }
  }, [validateOnChange, validateFieldLocal])

  // Handle field blur
  const handleFieldBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    if (validateOnBlur) {
      validateFieldLocal(field, values[field])
    }
  }, [validateOnBlur, validateFieldLocal, values])

  // Handle form submission
  const handleSubmit = useCallback(async (onSubmit: (values: T) => void | Promise<void>) => {
    if (validateOnSubmit) {
      const isValid = await validateForm()
      if (!isValid) {
        // Mark all fields as touched to show errors
        const allTouched: Record<keyof T, boolean> = {} as Record<keyof T, boolean>
        Object.keys(validationSchema).forEach((key) => {
          allTouched[key as keyof T] = true
        })
        setTouched(allTouched)
        return
      }
    }

    await onSubmit(values)
  }, [validateOnSubmit, validateForm, values, validationSchema])

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues)
    setTouched({} as Record<keyof T, boolean>)
    setErrors({} as Record<keyof T, string[]>)
  }, [initialValues])

  // Check if form is valid
  const isFormValid = Object.values(errors).every(fieldErrors => fieldErrors.length === 0)

  return {
    values,
    touched,
    errors,
    isValidating,
    isFormValid,
    setFieldValue,
    handleFieldBlur,
    validateField: validateFieldLocal,
    validateForm,
    handleSubmit,
    resetForm
  }
}

// Form field component with validation
interface FormFieldProps {
  name: string
  label: string
  value: any
  onChangeAction: (value: any) => void
  onBlur?: () => void
  errors?: string[]
  touched?: boolean
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'date' | 'textarea'
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
}

export function FormField({
  name,
  label,
  value,
  onChangeAction,
  onBlur,
  errors = [],
  touched = false,
  type = 'text',
  placeholder,
  className = '',
  required = false,
  disabled = false
}: FormFieldProps) {
  const hasErrors = touched && errors.length > 0
  const fieldId = `field-${name}`

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? Number(e.target.value) : e.target.value
    onChangeAction(newValue)
  }

  const renderInput = () => {
    const baseClasses = cn(
      'w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      hasErrors ? 'border-red-300 focus:ring-red-500' : 'border-gray-300',
      className
    )

    if (type === 'textarea') {
      return (
        <textarea
          id={fieldId}
          value={value || ''}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={baseClasses}
          disabled={disabled}
          rows={4}
        />
      )
    }

    return (
      <input
        id={fieldId}
        type={type}
        value={value || ''}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={baseClasses}
        required={required}
        disabled={disabled}
      />
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {renderInput()}
      
      {hasErrors && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <ValidationError
              key={index}
              error={error}
              className="text-sm"
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Form validation summary
interface FormValidationSummaryProps {
  errors: Record<string, string[]>
  touched: Record<string, boolean>
  className?: string
}

export function FormValidationSummary({ 
  errors, 
  touched, 
  className = '' 
}: FormValidationSummaryProps) {
  const allErrors = Object.entries(errors)
    .filter(([field, fieldErrors]) => touched[field] && fieldErrors.length > 0)
    .flatMap(([, fieldErrors]) => fieldErrors)

  if (allErrors.length === 0) return null

  return (
    <div className={cn('p-4 bg-red-50 border border-red-200 rounded-lg', className)}>
      <h3 className="text-sm font-medium text-red-800 mb-2">
        Please fix the following errors:
      </h3>
      <ul className="list-disc list-inside space-y-1">
        {allErrors.map((error, index) => (
          <li key={index} className="text-sm text-red-700">
            {error}
          </li>
        ))}
      </ul>
    </div>
  )
}

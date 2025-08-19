'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Image, Upload, X, Eye, Download, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageAttachmentProps {
  onImagesChange: (images: ImageFile[]) => void
  onSummaryChange?: (summary: string) => void
  maxFiles?: number
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
  className?: string
  disabled?: boolean
}

interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  summary?: string
  isProcessing?: boolean
}

export default function ImageAttachment({
  onImagesChange,
  onSummaryChange,
  maxFiles = 5,
  maxFileSize = 10, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  className,
  disabled = false
}: ImageAttachmentProps) {
  const [images, setImages] = useState<ImageFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const newImages: ImageFile[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name} is not a supported image type`)
        return
      }

      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name} is too large (max ${maxFileSize}MB)`)
        return
      }

      // Check if we've reached max files
      if (images.length + newImages.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} images allowed`)
        return
      }

      // Create image file object
      const imageFile: ImageFile = {
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      }

      newImages.push(imageFile)
    })

    // Show errors if any
    if (errors.length > 0) {
      setError(errors.join(', '))
      setTimeout(() => setError(null), 5000)
    }

    // Add new images
    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages]
      setImages(updatedImages)
      onImagesChange(updatedImages)
    }
  }, [images, maxFiles, maxFileSize, acceptedTypes, onImagesChange])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [handleFileSelect])

  // Remove image
  const removeImage = useCallback((id: string) => {
    const updatedImages = images.filter(img => img.id !== id)
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }, [images, onImagesChange])

  // Generate AI summary
  const generateSummary = useCallback(async () => {
    if (images.length === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      // Create FormData with images
      const formData = new FormData()
      images.forEach((img, index) => {
        formData.append(`image_${index}`, img.file)
      })

      // Call AI summarization API
      const response = await fetch('/api/ai/summarize-images', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      const aiSummary = data.summary

      setSummary(aiSummary)
      onSummaryChange?.(aiSummary)

      // Update images with summaries
      const updatedImages = images.map((img, index) => ({
        ...img,
        summary: data.imageSummaries?.[index] || '',
        isProcessing: false
      }))

      setImages(updatedImages)
      onImagesChange(updatedImages)

    } catch (err) {
      console.error('Failed to generate summary:', err)
      setError('Failed to generate AI summary. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [images, onSummaryChange, onImagesChange])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file type icon
  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* File Input */}
      <div className="space-y-2">
        <Label htmlFor="image-upload">Attach Images</Label>
        <Input
          id="image-upload"
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled || images.length >= maxFiles}
          className="hidden"
        />
        
        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            isDragOver 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isDragOver 
              ? "Drop images here" 
              : "Drag & drop images here or click to browse"
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Max {maxFiles} files, {maxFileSize}MB each. Supported: JPEG, PNG, WebP, HEIC
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Attached Images ({images.length}/{maxFiles})</h4>
            <Button
              onClick={generateSummary}
              disabled={isProcessing || disabled}
              size="sm"
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Generate AI Summary'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Image Preview */}
                  <div className="relative aspect-square bg-gray-100">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Remove Button */}
                    <Button
                      onClick={() => removeImage(image.id)}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </Button>

                    {/* Processing Indicator */}
                    {image.isProcessing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                      </div>
                    )}
                  </div>

                  {/* Image Info */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {getFileTypeIcon(image.type)}
                      <span className="text-sm font-medium truncate" title={image.name}>
                        {image.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(image.size)}</span>
                      <span>{image.uploadedAt.toLocaleDateString()}</span>
                    </div>

                    {/* Individual Image Summary */}
                    {image.summary && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>AI Summary:</strong> {image.summary}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => window.open(image.preview, '_blank')}
                        disabled={disabled}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = image.preview
                          link.download = image.name
                          link.click()
                        }}
                        disabled={disabled}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h4 className="font-medium">AI-Generated Summary</h4>
            </div>
            
            <Textarea
              value={summary}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setSummary(e.target.value)
                onSummaryChange?.(e.target.value)
              }}
              placeholder="AI summary will appear here..."
              className="min-h-[100px]"
              disabled={disabled}
            />
            
            <p className="text-xs text-gray-500 mt-2">
              This summary was generated by AI based on your attached images. 
              You can edit it to better describe your service request.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {images.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No images attached yet</p>
            <p className="text-sm mt-1">
              Attach images to help providers understand your service request better
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

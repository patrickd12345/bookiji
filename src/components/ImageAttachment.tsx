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
  images: File[];
  onImagesChangeAction: (images: File[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function ImageAttachment({
  images,
  onImagesChangeAction,
  maxImages = 5,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = ''
}: ImageAttachmentProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const newImages: File[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name} is not a supported image type`)
        return
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        errors.push(`${file.name} is too large (max ${maxSizeMB}MB)`)
        return
      }

      // Check if we've reached max files
      if (images.length + newImages.length >= maxImages) {
        errors.push(`Maximum ${maxImages} images allowed`)
        return
      }

      newImages.push(file)
    })

    // Show errors if any
    if (errors.length > 0) {
      setError(errors.join(', '))
      setTimeout(() => setError(null), 5000)
    }

    // Add new images
    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages]
      onImagesChangeAction(updatedImages)
    }
  }, [images, maxImages, maxSizeMB, acceptedTypes, onImagesChangeAction])

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
    const updatedImages = images.filter(img => img.name !== id) // Assuming name is unique for now
    onImagesChangeAction(updatedImages)
  }, [images, onImagesChangeAction])

  // Generate AI summary
  const generateSummary = useCallback(async () => {
    if (images.length === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      // Create FormData with images
      const formData = new FormData()
      images.forEach((img, index) => {
        formData.append(`image_${index}`, img)
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
      // onSummaryChange?.(aiSummary) // This prop was removed from interface

      // Update images with summaries
      // This part of the logic needs to be adapted to the new ImageFile interface
      // For now, we'll just update the summary in the state
      const updatedImages = images.map((img, index) => ({
        ...img,
        summary: data.imageSummaries?.[index] || '',
        isProcessing: false
      }))

      // onImagesChange(updatedImages) // This prop was removed from interface
      onImagesChangeAction(updatedImages) // Use the new prop

    } catch (err) {
      console.error('Failed to generate summary:', err)
      setError('Failed to generate AI summary. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [images, onImagesChangeAction])

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
          disabled={images.length >= maxImages}
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
            // disabled && "opacity-50 cursor-not-allowed" // This prop was removed from interface
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isDragOver 
              ? "Drop images here" 
              : "Drag & drop images here or click to browse"
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Max {maxImages} files, {maxSizeMB}MB each. Supported: JPEG, PNG, WebP
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
            <h4 className="font-medium">Attached Images ({images.length}/{maxImages})</h4>
            <Button
              onClick={generateSummary}
              disabled={isProcessing}
              size="sm"
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Generate AI Summary'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <Card key={image.name} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Image Preview */}
                  <div className="relative aspect-square bg-gray-100">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Remove Button */}
                    <Button
                      onClick={() => removeImage(image.name)}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      // disabled={disabled} // This prop was removed from interface
                    >
                      <X className="h-3 w-3" />
                    </Button>

                    {/* Processing Indicator */}
                    {/* This part of the logic needs to be adapted to the new ImageFile interface */}
                    {/* For now, we'll just show a placeholder */}
                    {/* {image.isProcessing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                      </div>
                    )} */}
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
                      <span>{new Date().toLocaleDateString()}</span> {/* Placeholder for uploadedAt */}
                    </div>

                    {/* Individual Image Summary */}
                    {/* This part of the logic needs to be adapted to the new ImageFile interface */}
                    {/* For now, we'll just show a placeholder */}
                    {/* {image.summary && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>AI Summary:</strong> {image.summary}
                      </div>
                    )} */}

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => window.open(URL.createObjectURL(image), '_blank')}
                        // disabled={disabled} // This prop was removed from interface
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
                          link.href = URL.createObjectURL(image)
                          link.download = image.name
                          link.click()
                        }}
                        // disabled={disabled} // This prop was removed from interface
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
                // onSummaryChange?.(e.target.value) // This prop was removed from interface
              }}
              placeholder="AI summary will appear here..."
              className="min-h-[100px]"
              // disabled={disabled} // This prop was removed from interface
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

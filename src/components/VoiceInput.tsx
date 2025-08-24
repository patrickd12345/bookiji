'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Volume2, VolumeX, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
  onTranscriptAction: (transcript: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoStart?: boolean;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export default function VoiceInput({ 
  onTranscriptAction, 
  onError, 
  disabled = false,
  className,
  placeholder = "Click to start voice input..."
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const finalTranscriptRef = useRef('')

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser')
      onError?.('Speech recognition not supported in this browser')
    }
  }, [onError])

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    const recognition = recognitionRef.current
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setIsPaused(false)
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      // Update confidence for the most recent result
      if (event.results.length > 0) {
        const lastResult = event.results[event.results.length - 1]
        if (lastResult.length > 0) {
          setConfidence(lastResult[0].confidence)
        }
      }

      setInterimTranscript(interimTranscript)
      finalTranscriptRef.current += finalTranscript
      setTranscript(finalTranscriptRef.current)

      // Auto-stop after 30 seconds of silence or when confidence is high
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        if (isListening && confidence > 0.8) {
          stopListening()
        }
      }, 30000)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      
      let errorMessage = 'Speech recognition error'
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage = 'Microphone access denied. Please check permissions.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.'
          break
        case 'network':
          errorMessage = 'Network error. Please check your connection.'
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not available.'
          break
        default:
          errorMessage = `Speech recognition error: ${event.error}`
      }
      
      setError(errorMessage)
      onError?.(errorMessage)
      setIsListening(false)
      setIsPaused(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setIsPaused(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isSupported, onError])

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported || disabled) return
    
    try {
      if (!recognitionRef.current) {
        initSpeechRecognition()
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.start()
        setTranscript('')
        setInterimTranscript('')
        finalTranscriptRef.current = ''
        setError(null)
      }
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setError('Failed to start speech recognition')
      onError?.('Failed to start speech recognition')
    }
  }, [isSupported, disabled, initSpeechRecognition, onError])

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    setIsPaused(false)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [isListening])

  // Pause/resume listening
  const togglePause = useCallback(() => {
    if (!isListening) return
    
    if (isPaused) {
      // Resume
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
      setIsPaused(false)
    } else {
      // Pause
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsPaused(true)
    }
  }, [isListening, isPaused])

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    finalTranscriptRef.current = ''
    setError(null)
  }, [])

  // Confirm and send transcript
  const confirmTranscript = useCallback(() => {
    if (transcript.trim()) {
      onTranscriptAction(transcript.trim())
      clearTranscript()
    }
  }, [transcript, onTranscriptAction, clearTranscript])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!isSupported) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-4 text-center text-muted-foreground">
          <MicOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Voice input not supported in this browser</p>
          <p className="text-sm">Try Chrome, Edge, or Safari</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Voice Input Controls */}
      <div className="flex items-center gap-3">
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          variant={isListening ? "destructive" : "default"}
          size="lg"
          className="relative"
        >
          {isListening ? (
            <>
              <MicOff className="h-5 w-5 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              Start Voice
            </>
          )}
          
          {isListening && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>

        {isListening && (
          <>
            <Button
              onClick={togglePause}
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              {isPaused ? (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Pause
                </>
              )}
            </Button>

            <Button
              onClick={clearTranscript}
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Status Indicators */}
      {isListening && (
        <div className="flex items-center gap-4 text-sm">
          <Badge variant={isPaused ? "secondary" : "default"}>
            {isPaused ? "Paused" : "Listening..."}
          </Badge>
          
          {confidence > 0 && (
            <Badge variant="outline">
              Confidence: {Math.round(confidence * 100)}%
            </Badge>
          )}
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-muted-foreground">Voice detected</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Transcript Display */}
      {(transcript || interimTranscript) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Voice Transcript</h4>
              <div className="flex gap-2">
                <Button
                  onClick={confirmTranscript}
                  size="sm"
                  disabled={!transcript.trim()}
                >
                  Confirm & Send
                </Button>
                <Button
                  onClick={clearTranscript}
                  variant="outline"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Final transcript */}
            {transcript && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Final:</p>
                <p className="p-3 bg-gray-50 rounded-lg border text-gray-900">
                  {transcript}
                </p>
              </div>
            )}

            {/* Interim transcript */}
            {interimTranscript && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Interim:</p>
                <p className="p-3 bg-blue-50 rounded-lg border text-blue-900 italic">
                  {interimTranscript}
                </p>
              </div>
            )}

            {/* Confidence indicator */}
            {confidence > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
                <span>{Math.round(confidence * 100)}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!isListening && !transcript && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center text-muted-foreground">
            <Mic className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>{placeholder}</p>
            <p className="text-sm mt-1">
              Click the microphone button to start voice input
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}




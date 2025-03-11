import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing audio recording and real-time transcription
 * @returns {Object} Audio recording state and control functions
 */
const useAudioRecorder = (deviceId = null) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const initialPositionRef = useRef(null);
  const isFirstTranscriptRef = useRef(true);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  // No MIME type or visualization needed for Web Speech API

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // Set audio source if device ID is provided
      if (deviceId) {
        recognition.audioSource = deviceId;
      }

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Punctuation conversion map
        const punctuationMap = {
          'full stop': '.',
          'period': '.',
          'comma': ',',
          'exclamation mark': '!',
          'question mark': '?',
          'colon': ':',
          'semicolon': ';',
          'new line': '\n',
          'newline': '\n',
          'new paragraph': '\n\n'
        };

        for (let i = event.resultIndex; i < event.results.length; i++) {
          let transcript = event.results[i][0].transcript.toLowerCase();
          
          // Convert spoken punctuation to symbols
          if (event.results[i].isFinal) {
            // Add spaces around the transcript to help with word boundary matching
            transcript = ' ' + transcript + ' ';
            for (const [spoken, symbol] of Object.entries(punctuationMap)) {
              transcript = transcript.replace(new RegExp(` ${spoken} `, 'g'), `${symbol} `);
            }
            transcript = transcript.trim();
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscription(prev => {
          const pos = initialPositionRef.current;
          const before = prev.slice(0, pos);
          const after = prev.slice(pos);

          // Check if we need to add spaces around the new text
          const needsSpaceBefore = before.length > 0 && 
            !before.endsWith(' ') && 
            !before.endsWith('.') && 
            !before.endsWith('?') && 
            !before.endsWith('!') && 
            !before.endsWith(',') && 
            !before.endsWith(':') && 
            !before.endsWith(';') && 
            !before.endsWith('\n');

          const needsSpaceAfter = after.length > 0 && 
            !finalTranscript.endsWith(' ') && 
            !finalTranscript.endsWith('.') && 
            !finalTranscript.endsWith('?') && 
            !finalTranscript.endsWith('!') && 
            !finalTranscript.endsWith(',') && 
            !finalTranscript.endsWith(':') && 
            !finalTranscript.endsWith(';') && 
            !finalTranscript.endsWith('\n') && 
            !after.startsWith(' ') && 
            !after.startsWith('.') && 
            !after.startsWith('?') && 
            !after.startsWith('!') && 
            !after.startsWith(',') && 
            !after.startsWith(':') && 
            !after.startsWith(';');

          // Construct the new text with proper spacing
          const newText = before + 
                         (needsSpaceBefore ? ' ' : '') + 
                         finalTranscript + 
                         (needsSpaceAfter ? ' ' : '') + 
                         after;

          // Update the cursor position to be after the newly inserted text
          initialPositionRef.current = pos + 
                                      (needsSpaceBefore ? 1 : 0) + 
                                      finalTranscript.length + 
                                      (needsSpaceAfter ? 1 : 0);

          return newText;
        });
      };

      recognitionRef.current = recognition;
    } else {
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Start recording and transcription
  const startRecording = useCallback(async (cursorPosition = null, initialText = '') => {
    if (isRecording) return;
    
    try {
      if (!recognitionRef.current) {
        setError('Speech recognition not initialized');
        return false;
      }

      // Set initial transcription if provided
      setTranscription(initialText);
      
      // Store initial cursor position and reset first transcript flag
      initialPositionRef.current = cursorPosition !== null ? cursorPosition : initialText.length;
      isFirstTranscriptRef.current = true;
      console.log('Starting recording with cursor at:', initialPositionRef.current);
      
      // Start recognition
      recognitionRef.current.start();
      return true;
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
      return false;
    }
  }, [isRecording]);

  // Stop recording and transcription
  const stopRecording = useCallback(() => {
    if (!isRecording || !recognitionRef.current) return;
    
    recognitionRef.current.stop();
  }, [isRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    transcription,
    error,
    startRecording,
    stopRecording,
  };
};

export default useAudioRecorder;

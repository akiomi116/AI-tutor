'use client';

import React, { useState, useEffect } from 'react';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript }) => {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            // @ts-ignore
            const speechRecognition = new window.webkitSpeechRecognition();
            speechRecognition.continuous = false;
            speechRecognition.interimResults = false;
            speechRecognition.lang = 'ja-JP';

            speechRecognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                onTranscript(transcript);
                setIsListening(false);
            };

            speechRecognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            speechRecognition.onend = () => {
                setIsListening(false);
            };

            setRecognition(speechRecognition);
        }
    }, [onTranscript]);

    const toggleListening = () => {
        if (recognition) {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
                setIsListening(true);
            }
        } else {
            alert('Braowser does not support speech recognition.');
        }
    };

    return (
        <button
            onClick={toggleListening}
            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            title={isListening ? 'Listening...' : 'Start Voice Input'}
        >
            {isListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H10a1 1 0 01-1-1v-4z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            )}
        </button>
    );
};

export default VoiceInput;

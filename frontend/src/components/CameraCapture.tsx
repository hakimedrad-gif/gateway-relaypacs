import React, { useEffect, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { Camera, X, RefreshCw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stream, error, startCamera, stopCamera } = useCamera();
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  useEffect(() => {
    startCamera({ facingMode: isFrontCamera ? 'user' : 'environment' });
    return () => stopCamera();
  }, [startCamera, stopCamera, isFrontCamera]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip if using front camera for mirror effect (optional, better UX)
        if (isFrontCamera) {
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0);
        } else {
          ctx.drawImage(video, 0, 0);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
              setCapturedFile(file);
            }
          },
          'image/jpeg',
          0.9,
        );
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose(); // Close after capture
    }
  };

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera);
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-6 rounded-lg text-white max-w-sm text-center">
          <p className="mb-4 text-red-400">Camera Error: {error.message}</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 w-full z-10 text-white">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10"
          aria-label="Close Camera"
        >
          <X size={24} />
        </button>
        <span className="font-medium">Scan Document</span>
        <button
          onClick={toggleCamera}
          className="p-2 rounded-full hover:bg-white/10"
          disabled={!!capturedImage}
          aria-label="Switch Camera"
        >
          <RefreshCw size={24} />
        </button>
      </div>

      {/* Main View */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {/* Hidden Canvas for capture processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Preview */}
        {!capturedImage && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
          />
        )}

        {/* Captured Image Preview */}
        {capturedImage && (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
        )}
      </div>

      {/* Controls */}
      <div className="h-32 bg-black flex items-center justify-center gap-8 relative z-10">
        {!capturedImage ? (
          <button
            onClick={handleCapture}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Take Photo"
          >
            <div className="w-16 h-16 bg-white rounded-full" />
          </button>
        ) : (
          <div className="flex gap-8 w-full justify-center px-8">
            <button
              onClick={handleRetake}
              className="flex-1 py-3 px-6 bg-slate-700 text-white rounded-full font-semibold max-w-[160px]"
            >
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-full font-semibold max-w-[160px] flex items-center justify-center gap-2"
            >
              <Check size={20} /> Use Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

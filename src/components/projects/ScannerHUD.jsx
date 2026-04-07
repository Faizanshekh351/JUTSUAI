import React, { useRef, useState, useEffect } from 'react'
import useCameraStream from '../../hooks/useCameraStream'
import CameraOverlay from './CameraOverlay'
import VfxEngine from '../vfx/VfxEngine'
import { Corner, Crosshair, ScanLine, TelemetryStrip, LiveIndicator, HandPrompt } from './HudElements'

const ScannerHUD = ({ onStreamReady, videoRef: externalVideoRef, canvasRef: externalCanvasRef, handCount = 0, prediction, latestHands }) => {
  const internalVideoRef = useRef(null)
  const videoRef = externalVideoRef || internalVideoRef
  const internalCanvasRef = useRef(null)
  const canvasRef = externalCanvasRef || internalCanvasRef

  const [scanY, setScanY] = useState(0)

  // Scan line animation
  useEffect(() => {
    const id = setInterval(() => setScanY(prev => (prev + 0.5) % 100), 16)
    return () => clearInterval(id)
  }, [])

  const { camStatus, fps, resolution, dots, startCam, stopCam, syncCanvas } = useCameraStream({
    videoRef,
    canvasRef,
    onStreamReady,
  })

  return (
    <div className='relative flex-1 flex items-center justify-center px-10 pb-4'>
      <div className='relative w-full max-w-3xl aspect-video bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,200,255,0.08),inset_0_0_80px_rgba(0,0,0,0.6)]'>

        {/* Live webcam feed */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${camStatus === 'ACTIVE' ? 'opacity-100' : 'opacity-0'}`}
          playsInline muted
          onLoadedMetadata={syncCanvas}
        />

        {/* Transparent AI canvas — skeleton is drawn here by useHandDetection */}
        <canvas
          ref={canvasRef}
          className='absolute inset-0 w-full h-full pointer-events-none z-10'
          style={{ background: 'transparent' }}
        />

        {camStatus === 'ACTIVE' && <ScanLine scanY={scanY} />}

        {/* --- SHADOW CLONE SMOKE FX --- */}
        <VfxEngine prediction={prediction} latestHands={latestHands} />

        <Corner position='tl' />
        <Corner position='tr' />
        <Corner position='bl' />
        <Corner position='br' />

        <Crosshair />

        <CameraOverlay camStatus={camStatus} dots={dots} onActivate={startCam} />

        <HandPrompt visible={camStatus === 'ACTIVE' && handCount === 0} />

        {/* Stop button */}
        {camStatus === 'ACTIVE' && (
          <button
            onClick={stopCam}
            className='absolute top-3 right-16 z-20 px-3 py-1 rounded-full border border-red-400/30 bg-red-400/10 text-red-400/70 font-outfit text-[10px] uppercase tracking-widest hover:bg-red-400/20 hover:border-red-400/60 transition-all duration-300'
          >
            Stop
          </button>
        )}

        <LiveIndicator camStatus={camStatus} />
        <TelemetryStrip camStatus={camStatus} fps={fps} resolution={resolution} />
      </div>
    </div>
  )
}

export default ScannerHUD

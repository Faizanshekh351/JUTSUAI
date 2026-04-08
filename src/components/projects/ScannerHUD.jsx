import React, { useRef, useState, useEffect, useCallback } from 'react'
import useCameraStream from '../../hooks/useCameraStream'
import CameraOverlay from './CameraOverlay'
import VfxEngine from '../vfx/VfxEngine'
import { Corner, Crosshair, ScanLine, TelemetryStrip, LiveIndicator, HandPrompt } from './HudElements'

const ScannerHUD = ({ onStreamReady, videoRef: externalVideoRef, canvasRef: externalCanvasRef, handCount = 0, prediction, latestHands }) => {
  const internalVideoRef = useRef(null)
  const videoRef = externalVideoRef || internalVideoRef
  const internalCanvasRef = useRef(null)
  const canvasRef = externalCanvasRef || internalCanvasRef

  /* ── refs & state ── */
  const containerRef = useRef(null)
  const [scanY, setScanY] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Scan line animation
  useEffect(() => {
    const id = setInterval(() => setScanY(prev => (prev + 0.5) % 100), 16)
    return () => clearInterval(id)
  }, [])

  /* ── Native Fullscreen API listener ──
   *  Syncs React state when the user exits via Escape, swipe, or device gesture.
   *  Covers both standard + webkit (Safari / older iOS). */
  useEffect(() => {
    const handleChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement
      setIsFullscreen(!!fsEl)
    }
    document.addEventListener('fullscreenchange', handleChange)
    document.addEventListener('webkitfullscreenchange', handleChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      document.removeEventListener('webkitfullscreenchange', handleChange)
    }
  }, [])

  const { camStatus, fps, resolution, dots, startCam, stopCam, syncCanvas } = useCameraStream({
    videoRef,
    canvasRef,
    onStreamReady,
  })

  /* ── Toggle: native requestFullscreen / exitFullscreen with webkit fallbacks ── */
  const toggleFullScreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      // Enter fullscreen
      if (el.requestFullscreen) el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
    }
  }, [])

  return (
    <div className='relative flex-1 flex items-center justify-center px-4 md:px-10 pb-4 mt-6 md:mt-0'>
      {/* ── This single wrapper is the fullscreen target ── */}
      <div
        ref={containerRef}
        className={`
          relative overflow-hidden bg-black transition-all duration-300
          ${isFullscreen
            ? 'w-screen h-screen rounded-none border-0 shadow-none'
            : 'w-full max-w-5xl aspect-video rounded-2xl border border-white/10 shadow-[0_0_80px_rgba(0,200,255,0.08),inset_0_0_80px_rgba(0,0,0,0.6)]'
          }
        `}
        style={isFullscreen ? { background: '#000' } : { background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
      >
        {/* Radial glow (visible in fullscreen for atmosphere) */}
        {isFullscreen && (
          <div
            className='absolute inset-0 pointer-events-none z-0'
            style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,180,255,0.07) 0%, transparent 70%)' }}
          />
        )}

        {/* Subtle grid overlay in fullscreen */}
        {isFullscreen && (
          <div
            className='absolute inset-0 pointer-events-none opacity-[0.025] z-0'
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        )}

        {/* Live webcam feed */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            camStatus === 'ACTIVE' ? 'opacity-100' : 'opacity-0'
          }`}
          playsInline
          muted
          onLoadedMetadata={syncCanvas}
        />

        {/* Transparent AI canvas — skeleton drawn by useHandDetection */}
        <canvas
          ref={canvasRef}
          className='absolute inset-0 w-full h-full pointer-events-none z-10'
          style={{ background: 'transparent', objectFit: 'cover' }}
        />

        {camStatus === 'ACTIVE' && <ScanLine scanY={scanY} />}

        {/* Shadow Clone Smoke FX */}
        <VfxEngine prediction={prediction} latestHands={latestHands} canvasRef={canvasRef} videoRef={videoRef} />

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
            className='absolute top-3 right-28 z-20 px-3 py-1 rounded-full border border-red-400/30 bg-red-400/10 text-red-400/70 font-outfit text-[10px] uppercase tracking-widest hover:bg-red-400/20 hover:border-red-400/60 transition-all duration-300'
          >
            Stop
          </button>
        )}

        {/* ⚡ Fullscreen toggle — native Web Fullscreen API ⚡ */}
        <button
          onClick={toggleFullScreen}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
          className='absolute top-3 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-400/70 hover:bg-cyan-400/20 hover:border-cyan-400/60 hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(0,200,255,0.3)] active:scale-90 transition-all duration-300'
        >
          {isFullscreen ? (
            /* Minimize / compress icon */
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7' />
            </svg>
          ) : (
            /* Maximize / expand icon */
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4' />
            </svg>
          )}
        </button>

        <LiveIndicator camStatus={camStatus} />
        <TelemetryStrip camStatus={camStatus} fps={fps} resolution={resolution} />

        {/* ESC hint — only in fullscreen */}
        {isFullscreen && (
          <div className='absolute bottom-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-pulse'>
            <span className='font-outfit text-[9px] uppercase tracking-[0.3em] text-white/25'>
              Press ESC to exit fullscreen
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScannerHUD

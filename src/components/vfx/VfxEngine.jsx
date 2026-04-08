import React, { useState, useEffect, useCallback, useRef } from 'react'

// Centralized styles for the Smoke VFX to avoid cluttering global CSS files
const fxStyles = `
  @keyframes smokeExpand {
    0%   { transform: translate(-50%, -50%) scale(0.1); opacity: 0.9; }
    30%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
  }
  @keyframes flashPop {
    0%   { transform: translate(-50%, -50%) scale(0); opacity: 1; filter: brightness(2); }
    10%  { transform: translate(-50%, -50%) scale(1.1); opacity: 1; filter: brightness(1.5); }
    100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; filter: brightness(1); }
  }
  @keyframes floatUp {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -150%) scale(1.5); opacity: 0; }
  }
  .fx-smoke-layer {
    position: absolute;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(200,200,200,0.8) 10%, rgba(100,100,100,0.4) 40%, transparent 70%);
    animation: smokeExpand 1s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    pointer-events: none;
    mix-blend-mode: screen;
  }
  .fx-flash-layer {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(0, 255, 200, 0.6) 20%, transparent 60%);
    animation: flashPop 0.5s ease-out forwards;
    pointer-events: none;
    mix-blend-mode: color-dodge;
  }
  .fx-text {
    position: absolute;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 24px;
    letter-spacing: 4px;
    text-shadow: 0 0 10px rgba(0, 255, 200, 0.8), 0 0 20px rgba(0, 255, 200, 0.4);
    animation: floatUp 1.2s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    pointer-events: none;
  }
  @keyframes cloneSlideLeft {
    0%   { transform: translate(-30%, -50%) scale(0.9); opacity: 0; filter: brightness(2) drop-shadow(0 0 20px cyan); }
    15%  { transform: translate(-80%, -50%) scale(1); opacity: 0.9; filter: brightness(1.2) drop-shadow(0 0 30px cyan); }
    80%  { transform: translate(-80%, -50%) scale(1); opacity: 0.9; filter: brightness(1); }
    100% { transform: translate(-85%, -55%) scale(1.05); opacity: 0; filter: blur(4px) brightness(0.5); }
  }
  @keyframes cloneSlideRight {
    0%   { transform: translate(-70%, -50%) scale(0.9); opacity: 0; filter: brightness(2) drop-shadow(0 0 20px cyan); }
    15%  { transform: translate(-20%, -50%) scale(1); opacity: 0.9; filter: brightness(1.2) drop-shadow(0 0 30px cyan); }
    80%  { transform: translate(-20%, -50%) scale(1); opacity: 0.9; filter: brightness(1); }
    100% { transform: translate(-15%, -55%) scale(1.05); opacity: 0; filter: blur(4px) brightness(0.5); }
  }
  .fx-clone-snapshot-left {
    position: absolute;
    width: 320px;
    height: 320px;
    object-fit: cover;
    border-radius: 20px;
    animation: cloneSlideLeft 1.5s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    pointer-events: none;
    z-index: 10;
    opacity: 0.8;
  }
  .fx-clone-snapshot-right {
    position: absolute;
    width: 320px;
    height: 320px;
    object-fit: cover;
    border-radius: 20px;
    animation: cloneSlideRight 1.5s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    pointer-events: none;
    z-index: 10;
    opacity: 0.8;
  }
`

const getBoundingCenter = (landmarks) => {
  let minX = 1, minY = 1, maxX = 0, maxY = 0
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x
    if (lm.y < minY) minY = lm.y
    if (lm.x > maxX) maxX = lm.x
    if (lm.y > maxY) maxY = lm.y
  }
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  }
}

/**
 * VfxEngine
 * Listens to the prediction stream. When confidence is >= 98%,
 * it spawns a visual effect exactly over the hands.
 */
const VfxEngine = ({ prediction, latestHands, videoRef }) => {
  const [effects, setEffects] = useState([])
  const lastSpawnRef = useRef(0)

  const spawnEffect = useCallback((x, y, label) => {
    let cloneImgSrc = null;

    // --- NEW: Take a physical snapshot of the user's webcam! ---
    if (videoRef?.current && label === 'SHADOW CLONE') {
      try {
        const snapCanvas = document.createElement('canvas')
        snapCanvas.width = videoRef.current.videoWidth || 640
        snapCanvas.height = videoRef.current.videoHeight || 480
        const snapCtx = snapCanvas.getContext('2d')
        // Ensure aspect ratio fits nicely inside our snapshot square
        snapCtx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height)
        cloneImgSrc = snapCanvas.toDataURL('image/webp', 0.8)
      } catch (e) {
        console.error("Failed to capture shadow clone snapshot", e)
      }
    }

    const id = Date.now() + Math.random()
    setEffects(prev => [...prev, { id, x, y, label, cloneImgSrc }])
    
    // Auto-cleanup the effect after it finishes (1.5 seconds)
    setTimeout(() => {
      setEffects(prev => prev.filter(fx => fx.id !== id))
    }, 1500)
  }, [videoRef])

  useEffect(() => {
    // We only want to trigger the clone effect if it's highly confident
    // AND if we have hand data to know where to spawn it.
    if (prediction && prediction.sign === 'Shadow Clone') {
       console.log(`[VfxEngine] Shadow Clone detected at ${Math.round(prediction.confidence * 100)}% confidence`);
    }

    if (prediction && prediction.sign === 'Shadow Clone' && prediction.confidence >= 0.70 && latestHands && latestHands.length > 0) {
      
      const now = Date.now()
      // Cooldown of 1.5 seconds between "Poofs" to prevent spamming
      if (now - lastSpawnRef.current > 1500) {
        lastSpawnRef.current = now
        
        // Calculate the center of the dominant hand (or the first hand in the array)
        const center = getBoundingCenter(latestHands[0])
        
        // Convert normalized [0, 1] coordinates to percentages for CSS
        spawnEffect(center.x * 100, center.y * 100, 'SHADOW CLONE')
      }
    }
  }, [prediction, latestHands, spawnEffect])

  // Don't render the wrapper at all if there are no effects
  if (effects.length === 0) return null

  return (
    <>
      <style>{fxStyles}</style>
      <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-2xl">
        {effects.map(fx => (
          <div key={fx.id} style={{ position: 'absolute', top: `${fx.y}%`, left: `${fx.x}%` }}>
            <div className="fx-smoke-layer" />
            <div className="fx-smoke-layer" style={{ animationDelay: '0.1s', transform: 'scale(1.2) rotate(45deg)' }} />
            <div className="fx-flash-layer" />
            
            {/* Render True Shadow Clones (Video Snapshots) */}
            {fx.cloneImgSrc && (
              <>
                <img src={fx.cloneImgSrc} className="fx-clone-snapshot-left" alt="Clone Left" />
                <img src={fx.cloneImgSrc} className="fx-clone-snapshot-right" alt="Clone Right" />
              </>
            )}

            <div className="fx-text">{fx.label}</div>
          </div>
        ))}
      </div>
    </>
  )
}

export default VfxEngine

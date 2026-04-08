import React, { useState, useEffect, useRef } from 'react'

// ─── Smoke Sprite: 5 frames × 120ms (Nasha's exact timing) ───────────────────
const SMOKE_FOLDERS = ['smoke_1', 'smoke_2', 'smoke_3']

const SmokeSprite = ({ leftPct, delay, scale = 1 }) => {
  const [frame, setFrame] = useState(0)
  const [visible, setVisible] = useState(false)
  const folder = useRef(SMOKE_FOLDERS[Math.floor(Math.random() * 3)])
  const size = Math.round(100 * scale)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true)
      let f = 0
      const id = setInterval(() => {
        f++
        if (f >= 5) { clearInterval(id); setVisible(false); return }
        setFrame(f)
      }, 120)
      return () => clearInterval(id)
    }, delay)
    return () => clearTimeout(t)
  }, [delay])

  if (!visible) return null

  // Nasha spawns two smoke bursts at x±15 from clone center
  const cx = `${leftPct + 17}%`   // center of the clone column
  return (
    <>
      <img src={`/${folder.current}/${frame + 1}.png`} alt=""
        style={{ position:'absolute', left:`calc(${cx} - ${size/2 + 18}px)`, bottom:'8%', width:size, height:size, pointerEvents:'none', zIndex:55 }} />
      <img src={`/${folder.current}/${frame + 1}.png`} alt=""
        style={{ position:'absolute', left:`calc(${cx} + ${18 - size/2}px)`, bottom:'8%', width:size, height:size, pointerEvents:'none', zIndex:55 }} />
    </>
  )
}

// ─── Single clone: narrow column cropped to person area ───────────────────────
const CloneImage = ({ src, leftPct, delay, opacity, zIdx, handX }) => {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <img
      src={src}
      alt=""
      style={{
        position: 'absolute',
        top: 0,
        left: `${leftPct}%`,
        width: '34%',
        height: '100%',
        objectFit: 'cover',
        // Sync crop to where user actually sits in the frame (hand position = rough body center)
        objectPosition: `${handX ?? 50}% top`,
        opacity: on ? opacity : 0,
        transition: 'opacity 0.2s ease-in',
        pointerEvents: 'none',
        zIndex: zIdx,
        // 28% inner fade — clone is already transparent well before it reaches center user zone
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28%, black 72%, transparent 100%)',
        maskImage: 'linear-gradient(to right, transparent 0%, black 28%, black 72%, transparent 100%)',
        filter: 'brightness(0.82) contrast(1.08)',
      }}
    />
  )
}

// ─── CSS for text popup ───────────────────────────────────────────────────────
const fxStyles = `
  @keyframes floatUp {
    0%   { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
    100% { transform: translate(-50%, -220%) scale(1.4); opacity: 0; }
  }
  @keyframes screenShake {
    0%   { transform: translate(0, 0) rotate(0deg); }
    10%  { transform: translate(-8px, -8px) rotate(-1deg); }
    20%  { transform: translate(8px, -4px) rotate(1deg); }
    30%  { transform: translate(-8px, 4px) rotate(0deg); }
    40%  { transform: translate(8px, 8px) rotate(1deg); }
    50%  { transform: translate(-4px, -8px) rotate(-1deg); }
    60%  { transform: translate(4px, 4px) rotate(0deg); }
    70%  { transform: translate(-2px, -2px) rotate(1deg); }
    80%  { transform: translate(2px, 2px) rotate(-1deg); }
    90%  { transform: translate(-1px, -1px) rotate(0deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }
  .fx-text {
    position: absolute;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 20px;
    letter-spacing: 4px;
    text-shadow: 0 0 8px rgba(255,255,255,1), 0 0 22px rgba(0,200,255,0.8);
    animation: floatUp 1.4s cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
    pointer-events: none;
    white-space: nowrap;
    z-index: 70;
  }
`

// ─── Clone config ─────────────────────────────────────────────────────────────
// Center zone 42–58% is kept 100% clear for the live user.
// Left clones:  right edge ≤ 42% (leftPct + 34 ≤ 42 → leftPct ≤ 8)
// Right clones: left edge  ≥ 58% (leftPct ≥ 58)
const CLONE_CONFIG = [
  // ── Left (cascade left from center) ────────────────────
  { leftPct:  8, delay: 1000, opacity: 0.88, zIdx: 14 }, // right edge 42% → clear of user
  { leftPct: -4, delay: 1300, opacity: 0.88, zIdx: 13 },
  { leftPct:-16, delay: 1600, opacity: 0.88, zIdx: 12 },
  { leftPct:-28, delay: 1900, opacity: 0.88, zIdx: 11 },
  // ── Right (mirror) ────────────────────────────────
  { leftPct: 58, delay: 1050, opacity: 0.88, zIdx: 14 }, // left edge 58% → clear of user
  { leftPct: 70, delay: 1350, opacity: 0.88, zIdx: 13 },
  { leftPct: 82, delay: 1650, opacity: 0.88, zIdx: 12 },
  { leftPct: 94, delay: 1950, opacity: 0.88, zIdx: 11 },
]

// ─── Main VfxEngine ───────────────────────────────────────────────────────────
const VfxEngine = ({ prediction, latestHands, videoRef }) => {
  const [effects, setEffects] = useState([])
  const lastSpawnRef = useRef(0)

  useEffect(() => {
    if (!prediction || prediction.sign !== 'Shadow Clone' || prediction.confidence < 0.70) return
    if (!latestHands || latestHands.length === 0) return

    const now = Date.now()
    if (now - lastSpawnRef.current > 4500) {
      lastSpawnRef.current = now
      const fxId = Date.now()
      console.log('💥 Shadow Clone!')

      // Trigger the Poof sound!
      const audio = new Audio('/poof.mp3')
      audio.volume = 0.8
      audio.play().catch(e => console.log('Audio requires user to interact with the page first, or missing /poof.mp3 asset.'))

      let cloneImgSrc = null
      try {
        const v = videoRef?.current
        if (v && v.readyState >= 2 && v.videoWidth > 0) {
          const snap = document.createElement('canvas')
          snap.width  = v.videoWidth
          snap.height = v.videoHeight
          snap.getContext('2d').drawImage(v, 0, 0)
          cloneImgSrc = snap.toDataURL('image/jpeg', 0.92)
          console.log('📸 Clone captured', snap.width, 'x', snap.height)
        }
      } catch (e) { console.error(e) }

      // Hand position for text anchor
      let handX = 50, handY = 45
      if (latestHands[0]?.length) {
        const lms = latestHands[0]
        let minX = 1, maxX = 0, minY = 1, maxY = 0
        for (const lm of lms) {
          if (lm.x < minX) minX = lm.x; if (lm.x > maxX) maxX = lm.x
          if (lm.y < minY) minY = lm.y; if (lm.y > maxY) maxY = lm.y
        }
        handX = ((minX + maxX) / 2) * 100
        handY = ((minY + maxY) / 2) * 100
      }

      setEffects(prev => [...prev, { id: fxId, handX, handY, cloneImgSrc }])
      setTimeout(() => setEffects(prev => prev.filter(fx => fx.id !== fxId)), 4500)
    }
  }, [prediction?.sign, prediction?.confidence])

  if (effects.length === 0) return null

  return (
    <>
      <style>{fxStyles}</style>
      <div 
        key={effects[effects.length - 1]?.id || 'empty'} // Re-triggers shake animation on new jutsu
        style={{ 
          position:'absolute', inset:0, zIndex:9999, pointerEvents:'none', overflow:'hidden',
          animation: 'screenShake 0.4s cubic-bezier(.36,.07,.19,.97) both'
        }}
      >
        {effects.map(fx => (
          <React.Fragment key={fx.id}>

            {/* Clones: narrow person-shaped columns cascading left */}
            {fx.cloneImgSrc && CLONE_CONFIG.map((cl, i) => (
              <CloneImage
                key={i}
                src={fx.cloneImgSrc}
                leftPct={cl.leftPct}
                delay={cl.delay}
                opacity={cl.opacity}
                zIdx={cl.zIdx}
                handX={fx.handX}
              />
            ))}

            {/* Smoke: at bottom of each clone column */}
            {CLONE_CONFIG.map((cl, i) => (
              <SmokeSprite
                key={i}
                leftPct={cl.leftPct}
                delay={cl.delay}
                scale={0.7 + i * 0.1}
              />
            ))}

            {/* Text popup at hand position */}
            <div style={{ position:'absolute', top:`${fx.handY}%`, left:`${fx.handX}%`, zIndex:70 }}>
              <div className="fx-text">SHADOW CLONE</div>
            </div>

          </React.Fragment>
        ))}
      </div>
    </>
  )
}

export default VfxEngine

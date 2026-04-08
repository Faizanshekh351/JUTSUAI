import { useEffect, useRef, useCallback } from 'react'
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import { extractAndNormalizeData } from '../utils/handData'

const MAX_GHOST_FRAMES = 60
const SMOOTHING_FACTOR = 0.7  // higher = more responsive to fast movement

// ─── 1. EXPONENTIAL MOVING AVERAGE SMOOTHING (WITH DISTANCE SNAP) ────────────
// If the wrist jumps > 10% of screen width in one frame → AI swapped hands or
// glitched. Snap instantly instead of sliding the skeleton across the screen.
function smoothLandmarks(current, previous) {
  if (!previous || previous.length !== current.length) return current

  // Distance snap check on wrist (landmark 0)
  const dx = current[0].x - previous[0].x
  const dy = current[0].y - previous[0].y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Hand jumped > 10% across screen in one frame — snap, don't smooth
  if (distance > 0.1) return current

  // Normal EMA smoothing
  return current.map((pt, i) => ({
    x: pt.x * SMOOTHING_FACTOR + previous[i].x * (1 - SMOOTHING_FACTOR),
    y: pt.y * SMOOTHING_FACTOR + previous[i].y * (1 - SMOOTHING_FACTOR),
    z: pt.z * SMOOTHING_FACTOR + previous[i].z * (1 - SMOOTHING_FACTOR),
  }))
}

// ─── 2. Z-AXIS DOMINANT HAND SELECTION ────────────────────────────────────────
// When hands overlap (e.g. Tiger seal), picks the hand closest to the camera
// by finding the lowest Z value (most negative = closest).
// This gives the Neural Network a clean, unobscured hand shape to read.
function getDominantHand(landmarks) {
  if (!landmarks || landmarks.length === 0) return null
  if (landmarks.length === 1) return { hand: landmarks[0], idx: 0 }

  // Average Z of the palm landmarks (0–5) to get a stable depth reading
  const avgZ = (lms) => lms.slice(0, 5).reduce((s, p) => s + p.z, 0) / 5

  const z0 = avgZ(landmarks[0])
  const z1 = avgZ(landmarks[1])

  // Lower (more negative) Z = closer to camera = dominant
  return z0 <= z1
    ? { hand: landmarks[0], idx: 0 }
    : { hand: landmarks[1], idx: 1 }
}

// ─── 2. BOUNDING BOX MATH ─────────────────────────────────────────────────────
// Finds the outermost joints and converts them to pixel coordinates.
function getBoundingBox(landmarks, canvasWidth, canvasHeight) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x
    if (lm.y < minY) minY = lm.y
    if (lm.x > maxX) maxX = lm.x
    if (lm.y > maxY) maxY = lm.y
  }
  return {
    x: minX * canvasWidth,
    y: minY * canvasHeight,
    w: (maxX - minX) * canvasWidth,
    h: (maxY - minY) * canvasHeight,
  }
}

// ─── 3. DRAWING ───────────────────────────────────────────────────────────────
function drawSkeleton(ctx, canvas, multiHandLandmarks, prediction) {
  multiHandLandmarks.forEach((landmarks, i) => {
    const isDetected   = prediction && prediction.sign !== '?'
    const lineColor    = isDetected ? '#facc15' : '#00e5ff'

    // Skeleton + joints
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: lineColor, lineWidth: 3 })
    drawLandmarks(ctx, landmarks, { color: '#ff1744', fillColor: '#ff1744aa', lineWidth: 1, radius: 5 })

    // ── Sci-Fi Bounding Box ─────────────────────────────────────────────────
    const PAD = 20
    const { x, y, w, h } = getBoundingBox(landmarks, canvas.width, canvas.height)
    const bx = x - PAD / 2
    const by = y - PAD / 2
    const bw = w + PAD
    const bh = h + PAD

    // Box colour shifts gold when a sign is recognised
    const boxColor = isDetected ? '#facc15' : '#4ade80'
    ctx.save()
    ctx.strokeStyle = boxColor
    ctx.lineWidth = 2
    ctx.strokeRect(bx, by, bw, bh)

    // Corner accents (YOLO-style)
    const cs = 12
    ctx.lineWidth = 3
    ;[
      [bx, by, cs, 0, 0, cs],
      [bx + bw, by, -cs, 0, 0, cs],
      [bx, by + bh, cs, 0, 0, -cs],
      [bx + bw, by + bh, -cs, 0, 0, -cs],
    ].forEach(([sx, sy, dx1, dy1, dx2, dy2]) => {
      ctx.beginPath()
      ctx.moveTo(sx + dx1, sy + dy1)
      ctx.lineTo(sx, sy)
      ctx.lineTo(sx + dx2, sy + dy2)
      ctx.stroke()
    })

    // Label pill — show sign name + confidence when detected, else hand label
    let labelText
    if (i === 0 && prediction) {
      const pct = Math.round(prediction.confidence * 100)
      labelText = prediction.sign !== '?'
        ? `[ ${prediction.sign.toUpperCase()}  ${pct}% ]`
        : `[ SCANNING… ${pct}% ]`
    } else {
      labelText = `[ DETECTED HAND ]`
    }

    ctx.font = 'bold 12px monospace'
    const textW = ctx.measureText(labelText).width
    const pillColor = (i === 0 && isDetected) ? '#facc15' : (i === 0 ? '#4ade80' : '#60a5fa')
    ctx.fillStyle = pillColor
    ctx.fillRect(bx, by - 24, textW + 12, 22)
    ctx.fillStyle = '#000'
    ctx.fillText(labelText, bx + 6, by - 7)
    ctx.restore()
  })
}

function drawGhostRing(ctx, canvas, frame) {
  const cx = canvas.width / 2, cy = canvas.height / 2
  ctx.save()
  ctx.strokeStyle = '#facc15aa'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.arc(cx, cy, 40, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.font = '700 11px monospace'
  ctx.fillStyle = '#facc15cc'
  ctx.textAlign = 'center'
  ctx.fillText(`GHOST LOCK  ${frame}/${MAX_GHOST_FRAMES}`, cx, cy + 60)
  ctx.textAlign = 'left'
  ctx.restore()
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export const useHandDetection = ({ videoRef, canvasRef, onResults, getPrediction, enabled = true }) => {
  const handsRef      = useRef(null)
  const rafRef        = useRef(null)
  const runningRef    = useRef(false)

  // Ghost Lock
  const isLocked      = useRef(false)
  const missingFrames = useRef(0)

  // EMA smoothing buffers
  const prevLandmarks = useRef([null, null])

  // ─── ZERO-LAG FAST CAPTURE (Bypasses React State) ──────────────────────────
  // The DataCollector UI controls these window variables via onPointerDown/Up
  if (typeof window !== 'undefined' && !window._fastCaptureDataset) {
    window._fastCaptureDataset = []
    window._isRecordingFast = false
    window._recordingLabel = 'Tiger'
  }

  const handleResults = useCallback(async (results) => {
    const canvas = canvasRef?.current
    const video  = videoRef?.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (video && video.videoWidth > 0) {
      if (canvas.width  !== video.videoWidth)  canvas.width  = video.videoWidth
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── NATIVE HANDS RESULTS ──────────────────────────────────────────────────
    const multiHandLandmarks = results.multiHandLandmarks || []
    const numHands = multiHandLandmarks.length

    // ── SCENARIO A: Hands visible ────────────────────────────────────────────
    if (numHands >= 1) {
      isLocked.current      = true
      missingFrames.current = 0

      const smoothed = multiHandLandmarks.map((lms, i) => {
        const s = smoothLandmarks(lms, prevLandmarks.current[i])
        prevLandmarks.current[i] = s
        return s
      })

      // Run AI inference only if we are NOT recording (Frees 100% CPU for capture)
      const prediction = (getPrediction && !window._isRecordingFast) ? getPrediction(smoothed) : null

      drawSkeleton(ctx, canvas, smoothed, prediction)

      const dominant = getDominantHand(smoothed)

      // ── DATA INTERCEPTOR (Zero Lag Fast Capture) ─────────────────────────────
      if (window._isRecordingFast) {
        const flatData = extractAndNormalizeData(smoothed)
        window._fastCaptureDataset.push({ label: window._recordingLabel, features: flatData })
      }

      onResults?.({
        hands:      smoothed,
        dominant:   dominant?.hand ?? null,
        locked:     true,
        ghost:      false,
        prediction: prediction ?? null,
      })

    // ── SCENARIO B: Ghost Mode ───────────────────────────────────────────────
    } else if (isLocked.current) {
      missingFrames.current += 1

      // Clear smoothing buffers so hands snap cleanly when they reappear
      // (prevents skeleton sliding from 60-frames-ago position)
      prevLandmarks.current = [null, null]

      if (missingFrames.current > MAX_GHOST_FRAMES) {
        isLocked.current      = false
        missingFrames.current = 0
        prevLandmarks.current = [null, null]  // clear smoothing buffers
        console.log('> TARGET LOST')
        onResults?.({ hands: [], dominant: null, locked: false, ghost: false })
      } else {
        console.log(`> HOLDING LOCK... (Ghost Frame ${missingFrames.current}/${MAX_GHOST_FRAMES})`)
        drawGhostRing(ctx, canvas, missingFrames.current)
        onResults?.({ hands: [], dominant: null, locked: true, ghost: true })
      }

    // ── SCENARIO C: Idle ─────────────────────────────────────────────────────
    } else {
      prevLandmarks.current = [null, null]
      onResults?.({ hands: [], dominant: null, locked: false, ghost: false })
    }
  }, [canvasRef, videoRef, onResults, getPrediction])

  // (StartCapture callback removed in favor of direct window variable access)

  useEffect(() => {
    if (!enabled) {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      return
    }

    const video = videoRef?.current
    if (!video) return

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    })

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.3, // Lower confidence allows it to grab highly-tangled hands!
      minTrackingConfidence: 0.3,
    })

    hands.onResults(handleResults)
    handsRef.current  = hands
    runningRef.current = true
    let isProcessing = false  // GATE: prevents frame queue buildup

    const loop = async () => {
      if (!runningRef.current) return
      const v = videoRef?.current
      if (v && v.readyState >= 2 && !v.paused && v.videoWidth > 0 && !isProcessing) {
        isProcessing = true
        try {
          await hands.send({ image: v })
        } catch (_) {
          // model still loading
        } finally {
          isProcessing = false  // always release gate even on error
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      hands.close()
      handsRef.current = null
      prevLandmarks.current = [null, null]
    }
  }, [enabled, videoRef, handleResults])

  return { handsRef }
}

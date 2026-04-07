import { useState, useEffect, useRef, useCallback } from 'react'

const RES_HIGH = { width: 1280, height: 720 }
const RES_LOW  = { width: 640,  height: 480 }
const FPS_DROP_THRESHOLD    = 15  // drop resolution if FPS falls below this
const FPS_RECOVER_THRESHOLD = 25  // restore high-res when FPS recovers above this

/**
 * useCameraStream
 * Handles camera lifecycle, FPS tracking, and automatic dynamic resolution scaling.
 * If FPS < 15 → drops to 640×480 to protect low-end hardware.
 * If FPS recovers > 25 → restores 1280×720 automatically.
 */
const useCameraStream = ({ videoRef, canvasRef, onStreamReady }) => {
  const [camStatus, setCamStatus] = useState('INACTIVE')
  const [fps, setFps] = useState('--')
  const [resolution, setResolution] = useState('1280×720')
  const [dots, setDots] = useState('')
  const frameCountRef = useRef(0)
  const lastFpsTime = useRef(Date.now())
  const currentResRef = useRef('HIGH') // 'HIGH' | 'LOW'

  // Awaiting dots animation
  useEffect(() => {
    if (camStatus !== 'INACTIVE') return
    const id = setInterval(() => setDots(prev => prev.length >= 3 ? '' : prev + '.'), 600)
    return () => clearInterval(id)
  }, [camStatus])

  // FPS counter + dynamic resolution watchdog
  useEffect(() => {
    if (camStatus !== 'ACTIVE') return

    let raf
    const tick = () => { frameCountRef.current++; raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)

    const timer = setInterval(async () => {
      const elapsed = (Date.now() - lastFpsTime.current) / 1000
      const currentFps = Math.round(frameCountRef.current / elapsed)
      setFps(currentFps.toString())
      frameCountRef.current = 0
      lastFpsTime.current = Date.now()

      // ── Dynamic Resolution Scaling ──────────────────────────────────────
      const video = videoRef.current
      if (!video?.srcObject) return

      if (currentFps < FPS_DROP_THRESHOLD && currentResRef.current === 'HIGH') {
        // FPS too low → downscale to 640×480
        console.log(`[Resolution] FPS=${currentFps} < ${FPS_DROP_THRESHOLD} → Downscaling to 640×480`)
        currentResRef.current = 'LOW'
        setResolution('640×480')

        const track = video.srcObject.getVideoTracks()[0]
        await track?.applyConstraints({ width: RES_LOW.width, height: RES_LOW.height })

      } else if (currentFps > FPS_RECOVER_THRESHOLD && currentResRef.current === 'LOW') {
        // FPS recovered → restore 1280×720
        console.log(`[Resolution] FPS=${currentFps} > ${FPS_RECOVER_THRESHOLD} → Restoring 1280×720`)
        currentResRef.current = 'HIGH'
        setResolution('1280×720')

        const track = video.srcObject.getVideoTracks()[0]
        await track?.applyConstraints({ width: RES_HIGH.width, height: RES_HIGH.height })
      }
    }, 1000)

    return () => { cancelAnimationFrame(raf); clearInterval(timer) }
  }, [camStatus, videoRef])

  const syncCanvas = useCallback(() => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    c.width = v.videoWidth || v.clientWidth
    c.height = v.videoHeight || v.clientHeight
  }, [videoRef, canvasRef])

  const startCam = async () => {
    setCamStatus('REQUESTING')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { ...RES_HIGH, facingMode: 'user' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        videoRef.current.onloadedmetadata = syncCanvas
        currentResRef.current = 'HIGH'
        setResolution('1280×720')
        setCamStatus('ACTIVE')
        onStreamReady?.(stream, canvasRef)
      }
    } catch {
      setCamStatus('DENIED')
    }
  }

  const stopCam = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    const ctx = canvasRef.current?.getContext('2d')
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setCamStatus('INACTIVE')
    setFps('--')
    setResolution('1280×720')
    currentResRef.current = 'HIGH'
    onStreamReady?.(null)
  }

  return { camStatus, fps, resolution, dots, startCam, stopCam, syncCanvas }
}

export default useCameraStream

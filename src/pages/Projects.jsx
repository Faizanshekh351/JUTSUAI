import React, { useRef, useState, useCallback } from 'react'
import TrackerHero from '../components/projects/TrackerHero'
import ScannerHUD from '../components/projects/ScannerHUD'
import ConsoleLogs from '../components/projects/ConsoleLogs'
import DataCollector from '../components/projects/DataCollector'
import { useHandDetection } from '../hooks/useHandDetection'
import { useLoadedModel } from '../hooks/useLoadedModel'

const Projects = () => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [streamActive, setStreamActive] = useState(false)
  const [detectionData, setDetectionData] = useState({ hands: [], signs: [] })
  const [latestHands, setLatestHands] = useState(null)
  const [prediction, setPrediction] = useState(null)

  // Load the pre-trained TF.js model from /model/model.json
  const { predict, modelStatus } = useLoadedModel()

  const handleStreamReady = useCallback((stream, cRef) => {
    setStreamActive(!!stream)
    // If ScannerHUD passes its internal canvas ref, sync it
    if (cRef?.current) canvasRef.current = cRef.current
  }, [])

  const handleResults = useCallback((data) => {
    setDetectionData(data)
    setLatestHands(data.hands?.length > 0 ? data.hands : null)
    
    // Fix 3: Guard state updates
    if (data.prediction) {
      setPrediction(prev => {
        if (prev?.sign === data.prediction.sign && prev?.confidence === data.prediction.confidence) {
          return prev;
        }
        return data.prediction;
      });
    } else if (!data.locked) {
      setPrediction(prev => prev === null ? null : null);
    }
  }, [])

  const { handsRef } = useHandDetection({
    videoRef,
    canvasRef,
    onResults:     handleResults,
    getPrediction: modelStatus === 'ready' ? predict : null,
    enabled:       streamActive,
  })

  return (
    <div
      className='min-h-screen w-full overflow-y-auto overflow-x-hidden flex flex-col font-outfit pb-24 md:pb-0'
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,180,255,0.06) 0%, #000 60%)' }}
    >
      {/* Subtle grid overlay */}
      <div
        className='fixed inset-0 pointer-events-none opacity-[0.03]'
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <TrackerHero />
      <ScannerHUD
        videoRef={videoRef}
        canvasRef={canvasRef}
        onStreamReady={handleStreamReady}
        handCount={detectionData.hands.length}
        prediction={prediction}
        latestHands={latestHands}
      />
      <ConsoleLogs detectionData={detectionData} handsActive={streamActive} prediction={prediction} modelStatus={modelStatus} />
      <DataCollector latestHands={latestHands} videoRef={videoRef} />
    </div>
  )
}

export default Projects

import React, { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import * as tf from '@tensorflow/tfjs'
import { extractAndNormalizeData, downloadJSON } from '../../utils/handData'
import { SIGN_LABELS } from '../../hooks/useLoadedModel'

const JUTSU_SIGNS = SIGN_LABELS
const FRAMES_PER_SAMPLE = 100

// ─── Photo capture helpers ─────────────────────────────────────────────────────
function captureFrameAsBlob(video) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  })
}

async function downloadPhotosAsZip(blobs, signName) {
  const zip = new JSZip()
  const folder = zip.folder(signName)
  blobs.forEach((blob, i) => {
    folder.file(`${signName}_${String(i + 1).padStart(3, '0')}.jpg`, blob)
  })
  const content = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = a.download = `${signName}_photos.zip`
  a.href = url
  a.download = `${signName}_photos.zip`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ─────────────────────────────────────────────────────────────────
const DataCollector = ({ videoRef }) => {
  const [selectedSign, setSelectedSign] = useState('Shadow Clone')
  const [mode, setMode]                 = useState('dojo')
  const [photoCount, setPhotoCount]     = useState(0)
  const [capturing, setCapturing]       = useState(false)
  const [statusMsg, setStatusMsg]       = useState('Awaiting Training Data...')
  const [open, setOpen]                 = useState(false)

  // Fast-Capture State tracker (React State used ONLY for UI, actual recording is on window)
  const [counts, setCounts] = useState({})
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)

  // Pull fast-capture counts into React every 300ms so UI updates without lagging the capture loop
  useEffect(() => {
    if (typeof window !== 'undefined' && !window._recordingLabel) {
      window._recordingLabel = 'Shadow Clone'
    }
    const pinger = setInterval(() => {
      if (window._fastCaptureDataset) {
        const c = {}
        JUTSU_SIGNS.forEach(sign => c[sign] = 0)
        window._fastCaptureDataset.forEach(d => {
          if (c[d.label] !== undefined) c[d.label]++
        })
        setCounts(c)
      }
    }, 300)
    return () => clearInterval(pinger)
  }, [])

  const [countdown, setCountdown] = useState(null)
  const [pendingLabel, setPendingLabel] = useState(null)

  // ─── Solo-Friendly Auto-Capture (3s Delay) ─────────────────────────────
  const startTimedRecording = (label) => {
    if (capturing || countdown !== null) return
    let t = 3
    setCountdown(t)
    setPendingLabel(label)
    setStatusMsg(`>> GET READY: ${t}...`)

    const tick = setInterval(() => {
      t -= 1
      if (t > 0) {
        setCountdown(t)
        setStatusMsg(`>> GET READY: ${t}...`)
      } else {
        clearInterval(tick)
        setCountdown(null)
        setCapturing(true)
        setStatusMsg(`>> RECORDING: ${label.toUpperCase()}... MOVE YOUR HANDS SLIGHTLY!`)
        
        if (typeof window !== 'undefined') {
          window._isRecordingFast = true
          window._recordingLabel = label
        }

        // Record for 2 seconds (roughly 120 frames at 60fps)
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window._isRecordingFast = false
          }
          setCapturing(false)
          setPendingLabel(null)
          setStatusMsg(`✓ Captured successfully! Data saved to buffer.`)
        }, 2000)
      }
    }, 1000)
  }

  // ─── In-Browser AI Training (Binary Classifier) ────────────────────────────
  const trainModelInBrowser = async () => {
    const ds = window._fastCaptureDataset || []
    if (ds.length < 20) {
      setStatusMsg('⚠ Gather more data before training!')
      return
    }

    setIsTraining(true)
    setStatusMsg('>> COMPILING MULTICLASS NEURAL NETWORK...')
    
    // Multi-Class Classifier: Supports unlimited Jutsu detection in a single file
    const model = tf.sequential()
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [126] }))
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }))
    model.add(tf.layers.dense({ units: JUTSU_SIGNS.length, activation: 'softmax' })) // Multi-Class output

    model.compile({ optimizer: 'adam', loss: 'sparseCategoricalCrossentropy', metrics: ['accuracy'] })

    // Map dataset labels to their array indicies (0 to N-1)
    const xsData = ds.map(d => d.features)
    const ysData = ds.map(d => JUTSU_SIGNS.indexOf(d.label))

    const xs = tf.tensor2d(xsData)
    const ys = tf.tensor1d(ysData, 'int32')

    setStatusMsg('>> TRAINING BRAIN (50 EPOCHS)...')

    await model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          setTrainingProgress(((epoch + 1) / 50) * 100)
          setStatusMsg(`Epoch ${epoch + 1}/50 — Loss: ${logs.loss.toFixed(4)}`)
        }
      }
    })

    xs.dispose()
    ys.dispose()

    setStatusMsg('>> TRAINING COMPLETE! Downlaoding weights...')
    
    // Auto-download files
    try {
      await model.save('downloads://model')
      setStatusMsg('✓ Downloaded! Place both files in public/model/.')
    } catch (err) {
      console.error(err)
      setStatusMsg('⚠ Failed to save model. Check console.')
    }

    setIsTraining(false)
    setTrainingProgress(0)
  }

  const handleClear = () => {
    if (typeof window !== 'undefined') window._fastCaptureDataset = []
    setCounts({})
    setStatusMsg('Brain wiped. Memory cleared.')
  }

  return (
    <div className='absolute bottom-14 right-4 z-30'>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(p => !p)}
        className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white/80 hover:border-white/20 font-outfit text-[10px] uppercase tracking-widest transition-all duration-300'
      >
        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
        </svg>
        Trainer Dojo
        <span className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className='absolute bottom-full right-0 mb-2 w-80 bg-black/85 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)]'>
          <div className='px-4 pt-4 pb-2 border-b border-white/5'>
            <p className='text-white/30 font-outfit text-[9px] uppercase tracking-widest'>Nasha-Style Zero-Lag Trainer</p>
            <p className='text-white/15 font-outfit text-[8px] mt-0.5'>Bypass React state for 60FPS data capture</p>
          </div>

          <div className='p-4 flex flex-col gap-3'>
            {/* Target Sign Selector */}
            <div>
              <label className='text-white/30 font-outfit text-[9px] uppercase tracking-widest block mb-1'>Target Jutsu</label>
              <select
                value={selectedSign}
                onChange={e => setSelectedSign(e.target.value)}
                disabled={isTraining || capturing}
                className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 font-outfit text-xs focus:outline-none focus:border-cyan-400/40 disabled:opacity-40'
              >
                {JUTSU_SIGNS.map(sign => (
                  <option key={sign} value={sign} className='bg-black'>{sign}</option>
                ))}
              </select>
            </div>

            {/* Hold to Record Buttons */}
            <div className='flex flex-col gap-2'>
              <div className='flex justify-between text-[10px] font-outfit tracking-widest px-1'>
                <span className='text-emerald-400/80'>✓ TARGET DATA: {counts[selectedSign] || 0}</span>
                <span className='text-red-400/80'>✗ IDLE DATA: {counts['Idle'] || 0}</span>
              </div>
              
              <button
                onClick={() => startTimedRecording(selectedSign)}
                disabled={isTraining || capturing || countdown !== null}
                className='w-full py-3 rounded-lg font-outfit text-xs uppercase tracking-widest transition-all duration-150 border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/60 active:scale-95 disabled:opacity-30'
              >
                {countdown !== null && pendingLabel === selectedSign 
                  ? `STARTING IN ${countdown}...` 
                  : (capturing && pendingLabel === selectedSign ? '● RECORDING...' : '[ CLICK ] RECORD SIGN')}
              </button>
              
              <button
                onClick={() => startTimedRecording('Idle')}
                disabled={isTraining || capturing || countdown !== null}
                className='w-full py-3 rounded-lg font-outfit text-xs uppercase tracking-widest transition-all duration-150 border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/60 active:scale-95 disabled:opacity-30'
              >
                {countdown !== null && pendingLabel === 'Idle' 
                  ? `STARTING IN ${countdown}...` 
                  : (capturing && pendingLabel === 'Idle' ? '● RECORDING...' : '[ CLICK ] RECORD IDLE / WRONG')}
              </button>
            </div>

            {/* Train & Clear Buttons */}
            <div className='flex gap-2 pt-1'>
              <button 
                onClick={trainModelInBrowser} 
                disabled={isTraining || capturing}
                className='flex-[2] py-2.5 rounded-lg border border-yellow-400/30 bg-yellow-400/10 text-yellow-500 font-syne font-bold text-[11px] uppercase tracking-widest hover:bg-yellow-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300'
              >
                ⚡ Train Brain
              </button>
              <button 
                onClick={handleClear} 
                disabled={isTraining || capturing}
                className='flex-1 px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white/30 font-outfit text-[10px] uppercase tracking-widest hover:text-white/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300'
              >
                Clear
              </button>
            </div>

            {isTraining && (
              <div className='w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1'>
                <div className='h-full bg-yellow-400/70 rounded-full transition-all duration-100 ease-linear' style={{ width: `${trainingProgress}%` }} />
              </div>
            )}

            {/* Status */}
            <p className='text-white/40 font-outfit text-[9px] leading-relaxed border-t border-white/5 pt-2 mt-1'>
              {statusMsg}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataCollector

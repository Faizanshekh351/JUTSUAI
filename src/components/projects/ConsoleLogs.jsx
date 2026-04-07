import React, { useState, useEffect, useRef } from 'react'

import { SIGN_LABELS } from '../../hooks/useLoadedModel'

const JUTSU_SIGNS = SIGN_LABELS

const BOOT_LINES = [
  '> Initializing MediaPipe Hands v2.0.0...',
  '> Loading TensorFlow.js runtime...',
  '> Compiling gesture model weights...',
  '> Binding input capture API...',
  `> 21 hand landmarks registered.`,
  `> Jutsu sign dictionary loaded. [${SIGN_LABELS.length} signs]`,
  `> Detection engine READY.`,
  '> Awaiting camera feed...',
]

const ConsoleLogs = ({ detectionData, handsActive, prediction, modelStatus }) => {
  const [lines, setLines] = useState([])
  const [bootDone, setBootDone] = useState(false)
  const logEndRef = useRef(null)

  // Boot sequence on mount
  useEffect(() => {
    let i = 0
    const bootInterval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setLines(prev => [...prev, { text: BOOT_LINES[i], type: 'boot', id: Date.now() + i }])
        i++
      } else {
        clearInterval(bootInterval)
        setBootDone(true)
      }
    }, 260)
    return () => clearInterval(bootInterval)
  }, [])

  // Log live hand detections + AI predictions to console
  useEffect(() => {
    if (!handsActive || !detectionData?.hands?.length) return
    const count = detectionData.hands.length
    const predText = prediction
      ? (prediction.sign !== '?'
          ? `— 🥷 ${prediction.sign} (${Math.round(prediction.confidence * 100)}%)`
          : `— scanning… (${Math.round(prediction.confidence * 100)}%)`)
      : ''
    setLines(prev => [
      ...prev.slice(-40),
      {
        text: `> ${count} hand${count > 1 ? 's' : ''} detected — tracking ${count * 21} landmarks ${predText}`,
        type: prediction?.sign !== '?' ? 'hit' : 'detect',
        id: Date.now(),
      }
    ])
  }, [detectionData, handsActive, prediction])

  // Scroll console to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const handCount = detectionData?.hands?.length ?? 0

  return (
    <div className='flex gap-3 px-10 pb-8 z-10'>

      {/* Detection log panel */}
      <div className='flex-1 bg-black/40 backdrop-blur-md border border-white/8 rounded-xl p-4 font-mono text-xs overflow-hidden'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-white/30 uppercase tracking-widest text-[10px] font-outfit'>Detection Console</span>
          <div className='flex gap-1.5'>
            <div className='w-2 h-2 rounded-full bg-white/10'></div>
            <div className='w-2 h-2 rounded-full bg-white/10'></div>
            <div className={`w-2 h-2 rounded-full ${handsActive ? 'bg-emerald-500/70 animate-pulse' : 'bg-white/10'}`}></div>
          </div>
        </div>
        <div className='flex flex-col gap-1 max-h-28 overflow-y-auto'>
          {lines.map(line => (
            <div
              key={line.id}
              className={`leading-relaxed ${
                line.type === 'hit'    ? 'text-yellow-400/90 font-bold' :
                line.type === 'detect' ? 'text-cyan-400/80' : 'text-emerald-400/70'
              }`}
            >
              {line.text}
            </div>
          ))}
          {bootDone && <div className='text-white/20 animate-pulse'>_</div>}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Jutsu sign grid — active sign glows gold */}
      <div className='bg-black/40 backdrop-blur-md border border-white/8 rounded-xl p-4 w-72'>
        <div className='text-white/30 uppercase tracking-widest text-[10px] font-outfit mb-3'>Known Jutsu Signs</div>
        <div className='grid grid-cols-5 gap-1.5'>
          {JUTSU_SIGNS.map((sign) => {
            const isActive = prediction?.sign === sign
            return (
              <div
                key={sign}
                className={`flex flex-col items-center justify-center border rounded-lg py-1.5 px-1 gap-0.5 transition-all duration-300 cursor-default group ${
                  isActive
                    ? 'bg-yellow-400/20 border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.3)]'
                    : 'bg-white/5 border-white/8 hover:border-cyan-400/30 hover:bg-cyan-400/5'
                }`}
              >
                <span className={`text-[9px] font-outfit uppercase tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-yellow-300 font-bold' : 'text-white/20 group-hover:text-cyan-400/60'
                }`}>
                  {sign}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats panel — now includes prediction readout */}
      <div className='bg-black/40 backdrop-blur-md border border-white/8 rounded-xl p-4 w-44 flex flex-col gap-3'>
        <div className='text-white/30 uppercase tracking-widest text-[10px] font-outfit'>Session Stats</div>
        {[
          { label: 'Hands Detected', val: `${handCount}/2` },
          { label: 'Landmarks', val: handCount > 0 ? `${handCount * 21}` : '0' },
          {
            label: 'AI Model',
            val: modelStatus === 'ready' ? 'LOADED ✓' : modelStatus === 'loading' ? 'LOADING…' : 'ERROR ✗',
            color: modelStatus === 'ready' ? 'text-emerald-400' : modelStatus === 'error' ? 'text-red-400' : 'text-yellow-400/80'
          },
          { label: 'Status', val: handsActive ? 'LIVE' : 'IDLE' },
        ].map(stat => (
          <div key={stat.label} className='flex flex-col gap-0.5'>
            <span className='text-white/20 text-[9px] font-outfit uppercase tracking-widest'>{stat.label}</span>
            <span className={`text-sm font-syne font-bold ${
              stat.color ?? (stat.label === 'Status' && handsActive ? 'text-emerald-400' : 'text-white/60')
            }`}>
              {stat.val}
            </span>
          </div>
        ))}

        {/* Live prediction readout */}
        {prediction && (
          <div className='border-t border-white/5 pt-2 flex flex-col gap-1'>
            <span className='text-white/20 text-[9px] font-outfit uppercase tracking-widest'>Detected Sign</span>
            <span className={`text-base font-syne font-bold ${
              prediction.sign !== '?' ? 'text-yellow-300' : 'text-white/30'
            }`}>
              {prediction.sign !== '?' ? prediction.sign : '—'}
            </span>
            {/* Confidence bar */}
            <div className='w-full h-1 bg-white/5 rounded-full overflow-hidden'>
              <div
                className='h-full rounded-full transition-all duration-150'
                style={{
                  width: `${Math.round(prediction.confidence * 100)}%`,
                  background: prediction.sign !== '?' ? '#facc15' : '#4ade8066',
                }}
              />
            </div>
            <span className='text-white/20 text-[8px] font-outfit'>
              {Math.round(prediction.confidence * 100)}% confidence
            </span>
          </div>
        )}
      </div>

    </div>
  )
}

export default ConsoleLogs

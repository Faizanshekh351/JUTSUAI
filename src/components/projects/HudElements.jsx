import React from 'react'

/** Corner accent marks at each edge of the HUD frame */
export const Corner = ({ position }) => {
  const posClasses = {
    tl: 'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
    tr: 'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
    bl: 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
    br: 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
  }
  return <div className={`absolute w-6 h-6 border-cyan-400/70 ${posClasses[position]}`} />
}

/** Rotating crosshair in the center of the frame */
export const Crosshair = () => (
  <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-10'>
    <div className='relative w-16 h-16'>
      <div className='absolute inset-0 border border-cyan-400/20 rounded-full' />
      <div className='absolute top-1/2 left-0 right-0 h-px bg-cyan-400/30' />
      <div className='absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/30' />
      <div className='absolute inset-[30%] border border-cyan-400/40 rotate-45' />
    </div>
  </div>
)

/** Sweeping scan line that animates over the live feed */
export const ScanLine = ({ scanY }) => (
  <div
    className='absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none z-10'
    style={{ top: `${scanY}%` }}
  />
)

/** Bottom telemetry strip showing feed status, resolution, FPS, and model */
export const TelemetryStrip = ({ camStatus, fps, resolution = '1280×720' }) => (
  <div className='absolute bottom-0 left-0 right-0 px-4 py-2 bg-black/50 backdrop-blur-sm border-t border-white/5 flex items-center justify-between z-20'>
    <span className={`font-outfit text-[10px] uppercase tracking-widest ${camStatus === 'ACTIVE' ? 'text-emerald-400/70' : 'text-cyan-400/40'}`}>
      FEED: {camStatus}
    </span>
    <span className={`font-outfit text-[10px] uppercase tracking-widest ${resolution === '640×480' ? 'text-yellow-400/70' : 'text-white/20'}`}>
      RES: {resolution}
    </span>
    <span className='text-white/20 font-outfit text-[10px] uppercase tracking-widest'>FPS: {fps}</span>
    <span className='text-cyan-400/40 font-outfit text-[10px] uppercase tracking-widest'>MODEL: MEDIAPIPE v2</span>
  </div>
)

/** Live indicator dot + label in the top-left corner */
export const LiveIndicator = ({ camStatus }) => (
  <div className='absolute top-3 left-4 flex items-center gap-2 z-20'>
    <div className={`w-1.5 h-1.5 rounded-full ${camStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
    <span className={`font-outfit text-[10px] uppercase tracking-widest ${camStatus === 'ACTIVE' ? 'text-emerald-400/70' : 'text-white/20'}`}>
      {camStatus === 'ACTIVE' ? 'CAM_01 · LIVE' : 'CAM_01'}
    </span>
  </div>
)

/** Pulsing banner shown when camera is live but no hands detected */
export const HandPrompt = ({ visible }) => {
  if (!visible) return null
  return (
    <div className='absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-20'>
      <div className='flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 backdrop-blur-sm animate-pulse'>
        <svg className='w-4 h-4 text-yellow-400/70' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11' />
        </svg>
        <span className='text-yellow-400/70 font-outfit text-xs uppercase tracking-widest'>Show your hands to the camera</span>
      </div>
    </div>
  )
}

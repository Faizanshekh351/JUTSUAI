import React from 'react'

/**
 * CameraOverlay
 * Shows the correct UI based on camera state:
 *  - INACTIVE → "Activate Camera" button
 *  - REQUESTING → spinner
 *  - DENIED → error + retry button
 */
const CameraOverlay = ({ camStatus, dots, onActivate }) => {
  if (camStatus === 'ACTIVE') return null

  return (
    <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 z-20'>
      {camStatus === 'INACTIVE' && (
        <>
          <svg className='w-10 h-10 text-white/10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1} d='M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z' />
          </svg>
          <p className='text-white/20 font-outfit text-sm uppercase tracking-widest'>Awaiting Video Feed{dots}</p>
          <button
            onClick={onActivate}
            className='mt-2 px-6 py-2.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-400 font-outfit text-xs uppercase tracking-widest hover:bg-cyan-400/20 hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(0,200,255,0.3)] transition-all duration-300'
          >
            Activate Camera
          </button>
        </>
      )}

      {camStatus === 'REQUESTING' && (
        <div className='flex items-center gap-3'>
          <div className='w-3 h-3 rounded-full border-2 border-cyan-400/60 border-t-transparent animate-spin' />
          <p className='text-cyan-400/60 font-outfit text-sm uppercase tracking-widest'>Requesting Access…</p>
        </div>
      )}

      {camStatus === 'DENIED' && (
        <>
          <svg className='w-10 h-10 text-red-400/50' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636' />
          </svg>
          <p className='text-red-400/60 font-outfit text-sm uppercase tracking-widest'>Camera Access Denied</p>
          <button
            onClick={onActivate}
            className='mt-2 px-6 py-2.5 rounded-full border border-red-400/40 bg-red-400/10 text-red-400 font-outfit text-xs uppercase tracking-widest hover:bg-red-400/20 transition-all duration-300'
          >
            Try Again
          </button>
        </>
      )}
    </div>
  )
}

export default CameraOverlay

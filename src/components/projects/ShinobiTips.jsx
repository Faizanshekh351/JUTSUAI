import React, { useState } from 'react'

const TIPS = [
  {
    icon: '✦',
    title: 'Keep a tiny gap',
    body: 'Leave ~½ inch between both hands during signs like Boar or Dog. The background sliver lets the AI see two separate objects.',
    color: 'text-cyan-400',
    border: 'border-cyan-400/20',
    bg: 'bg-cyan-400/5',
  },
  {
    icon: '◈',
    title: 'Angle toward the camera',
    body: 'Tilt your palms slightly toward the webcam so it can see part of your palm — not perfectly sideways.',
    color: 'text-violet-400',
    border: 'border-violet-400/20',
    bg: 'bg-violet-400/5',
  },
  {
    icon: '⬡',
    title: 'Good lighting matters',
    body: 'Face a light source (window or lamp). Dark backgrounds improve contrast so MediaPipe finds your skin edges faster.',
    color: 'text-emerald-400',
    border: 'border-emerald-400/20',
    bg: 'bg-emerald-400/5',
  },
  {
    icon: '◎',
    title: 'Slow down transitions',
    body: 'Move between signs at 60–70% of anime speed. The Ghost Lock gives you a full second of leniency, so breathe.',
    color: 'text-yellow-400',
    border: 'border-yellow-400/20',
    bg: 'bg-yellow-400/5',
  },
]

const ShinobiTips = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className='relative'>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white/80 hover:border-white/20 font-outfit text-[10px] uppercase tracking-widest transition-all duration-300'
      >
        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
        </svg>
        Shinobi Tips
        <span className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className='absolute top-full right-0 mt-2 w-72 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)]'>
          <div className='px-4 pt-4 pb-1'>
            <p className='text-white/20 font-outfit text-[9px] uppercase tracking-widest'>Shinobi Training · Camera Tips</p>
          </div>
          <div className='flex flex-col gap-1 p-2'>
            {TIPS.map(tip => (
              <div
                key={tip.title}
                className={`flex gap-3 p-3 rounded-lg border ${tip.border} ${tip.bg} transition-all duration-200`}
              >
                <span className={`${tip.color} text-lg leading-none mt-0.5 flex-shrink-0`}>{tip.icon}</span>
                <div>
                  <p className={`${tip.color} font-syne font-bold text-xs mb-0.5`}>{tip.title}</p>
                  <p className='text-white/40 font-outfit text-[10px] leading-relaxed'>{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className='px-4 py-2 border-t border-white/5'>
            <p className='text-white/15 font-outfit text-[9px] uppercase tracking-widest text-center'>
              Ghost Lock active · 60 frame buffer
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShinobiTips

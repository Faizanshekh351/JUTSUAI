import React from 'react'
import { Link } from 'react-router-dom'
import ShinobiTips from './ShinobiTips'

const TrackerHero = () => {
  return (
    <div className='relative flex items-center justify-between px-10 py-6 z-10'>
      {/* Back button */}
      <Link to='/' className='flex items-center gap-2 text-white/40 hover:text-white/90 transition-colors duration-300 font-outfit text-sm uppercase tracking-widest'>
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18' />
        </svg>
        Back
      </Link>

      {/* Title */}
      <div className='absolute left-1/2 -translate-x-1/2 text-center'>
        <div className='text-[0.6rem] uppercase tracking-[0.4em] text-white/30 font-outfit mb-1'>AI Powered</div>
        <h1 className='text-xl md:text-2xl font-syne font-extrabold uppercase tracking-widest text-white' style={{ textShadow: '0 0 20px rgba(120,200,255,0.6), 0 0 60px rgba(120,200,255,0.2)' }}>
          Jutsu Hand Tracker
        </h1>
      </div>

      {/* Right side: tips + status badge */}
      <div className='flex items-center gap-3'>
        <ShinobiTips />
        <div className='flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2'>
          <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse'></span>
          <span className='text-emerald-400 text-xs font-outfit uppercase tracking-widest'>System Ready</span>
        </div>
      </div>
    </div>
  )
}

export default TrackerHero

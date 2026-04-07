import React from 'react'
import { Link } from 'react-router-dom'

const GifButton = ({ to, children, animationDelay }) => {
  return (
    <Link 
      to={to} 
      className='group relative h-[6vw] w-[14vw] rounded-full mx-6 overflow-hidden flex justify-center items-center flex-shrink-0 border border-white/20 animate-btn text-[2vw] leading-none uppercase font-semibold text-white/90 bg-white/5 backdrop-blur-sm shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] hover:-translate-y-2 hover:scale-105 active:scale-95 transition-all duration-300'
      style={{ animationDelay }}
    >
      {/* The GIF Background that reveals purely on hover */}
      <img 
        src="/download.gif" 
        alt="Animated background" 
        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none mix-blend-screen scale-[2.9] mt-12" 
      />
      
      {/* The actual text layer */}
      <span className="relative z-10 drop-shadow-md text-center flex items-center justify-center w-full">{children}</span>
    </Link>
  )
}

export default GifButton

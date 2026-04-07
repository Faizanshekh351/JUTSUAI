import React from 'react'
import Video from './Video'

const HomeHeroText = () => {
  return (
    <div className='text-center pt-10 flex flex-col gap-5 font-syne tracking-wide z-10 relative pointer-events-none'>
      <div className='text-[4vw] justify-center flex items-center uppercase font-extrabold text-white/90 text-aura-glow leading-tight'>  WELCOME </div>
      <div className='text-[4vw] justify-center flex items-center uppercase font-extrabold text-white/90 text-aura-glow leading-tight'> TO MY 
        <div className='h-[5vw] w-[14vw] rounded-full mx-6 overflow-hidden flex justify-center items-center flex-shrink-0 shadow-[0_0_30px_rgba(255,255,255,0.3)] border border-white/20'>
          <Video />
        </div>
         WEBSITE </div>
      <div className='text-[4vw] justify-center flex items-center uppercase font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white/90 to-white/50 text-aura-glow leading-tight tracking-wider text-center'> CREATED BY FAIZAN </div>
    </div>
  )
}

export default HomeHeroText

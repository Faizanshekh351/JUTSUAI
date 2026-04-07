import React from 'react'
import GifButton from './GifButton'

const HomeBottomText = () => {
  return (
    <div className='flex items-center justify-center gap-6 text-white mb-10 font-outfit tracking-wider z-20 relative'>
      <GifButton to='/projects'>Jutsu TRACKER</GifButton>
      <GifButton to='/agence' animationDelay='1s'>About It</GifButton>
    </div>
  )
}

export default HomeBottomText

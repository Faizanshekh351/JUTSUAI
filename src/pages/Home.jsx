import React from 'react'
import Video from '../components/home/Video'
import HomeHeroText from '../components/home/HomeHeroText'
import HomeBottomText from '../components/home/HomeBottomText'

const Home = () => {
   return (
      <div>
         <div className='h-screen w-full fixed'>
            <Video />
         </div>
         <div className='h-screen w-full relative flex flex-col justify-between text-white'>
            <HomeHeroText />
            <HomeBottomText />
         </div>
      </div>
   )
}

export default Home

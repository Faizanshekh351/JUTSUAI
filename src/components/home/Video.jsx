import React, { useEffect, useRef } from 'react'

const Video = () => {
  const videoRef = useRef(null)

  useEffect(() => {
    // Sync all videos to the first one found on the page
    const syncVideo = () => {
      if (!videoRef.current) return;
      const allVideos = document.querySelectorAll('video');
      if (allVideos.length > 0) {
        const master = allVideos[0];
        // If this isn't the master video and they are out of sync by more than a frame
        if (master !== videoRef.current && Math.abs(master.currentTime - videoRef.current.currentTime) > 0.1) {
          videoRef.current.currentTime = master.currentTime;
        }
      }
    };

    // Check periodically to keep them in sync
    const intervalId = setInterval(syncVideo, 500);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className='h-full w-full'>
      <video ref={videoRef} className='h-full w-full object-cover pointer-events-none' autoPlay muted loop playsInline poster="/video-poster.jpg" src="/video.mp4"></video>
    </div>
  )
}

export default Video
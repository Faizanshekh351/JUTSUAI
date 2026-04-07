// handDetection.worker.js
// Runs entirely in a background thread — MediaPipe never touches the Main Thread

import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands'

let hands = null
let ready = false

// Initialize MediaPipe inside the worker
async function init() {
  hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
  })

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  hands.onResults((results) => {
    // Post landmark data back to the main thread
    self.postMessage({
      type: 'RESULTS',
      multiHandLandmarks: results.multiHandLandmarks ?? [],
      multiHandedness: results.multiHandedness ?? [],
    })
  })

  await hands.initialize()
  ready = true
  self.postMessage({ type: 'READY' })
}

// Listen for frames coming from the main thread
self.onmessage = async (e) => {
  if (e.data.type === 'INIT') {
    await init()
    return
  }

  if (e.data.type === 'FRAME' && ready && hands) {
    try {
      // e.data.bitmap is an ImageBitmap (zero-copy from video frame)
      await hands.send({ image: e.data.bitmap })
      // Transfer done — close to free GPU memory
      e.data.bitmap.close()
    } catch (_) {
      // Model still loading — silently skip
    }
  }

  if (e.data.type === 'STOP') {
    hands?.close()
    hands = null
    ready = false
  }
}

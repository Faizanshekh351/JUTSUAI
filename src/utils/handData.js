/**
 * extractAndNormalizeData
 *
 * Converts raw MediaPipe multiHandLandmarks into a flat 126-number array:
 * 21 joints × 3 coordinates (x,y,z) × 2 hands = 126 features.
 *
 * The wrist (landmark 0) is used as the origin (0,0,0) for each hand,
 * making the data position-invariant and scale-invariant.
 * The AI will recognize signs regardless of where you stand in frame.
 */
export function extractAndNormalizeData(multiHandLandmarks) {
  const flatData = new Array(126).fill(0)

  if (!multiHandLandmarks || multiHandLandmarks.length === 0) return flatData

  // 1. Sort hands by Z-Axis Depth.
  // The wrist (landmark 0) with the lowest Z is closest to the camera.
  // This physically locks the array so tangled hands never rapidly swap slots 0-62 and 63-125!
  let sortedHands = [...multiHandLandmarks].sort((a, b) => a[0].z - b[0].z)

  for (let i = 0; i < Math.min(sortedHands.length, 2); i++) {
    const hand = sortedHands[i]
    if (!hand) continue
    const wrist = hand[0]
    
    // Front hand always fills slot 0. Back hand always fills slot 1.
    const offset = i * 63

    hand.forEach((joint, index) => {
      flatData[offset + index * 3]     = joint.x - wrist.x
      flatData[offset + index * 3 + 1] = joint.y - wrist.y
      flatData[offset + index * 3 + 2] = joint.z - wrist.z
    })
  }

  return flatData
}

/**
 * downloadJSON
 * Triggers a browser file download of any JS object as a .json file.
 */
export function downloadJSON(data, filename = 'data.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

import { useRef, useState, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'

const SIGN_LABELS = ['Snake', 'Ram', 'Monkey', 'Boar', 'Horse', 'Tiger', 'Dog', 'Ox', 'Rabbit', 'Bird', 'Idle']
const NUM_CLASSES = SIGN_LABELS.length
const NUM_FEATURES = 63 // 21 landmarks × (x, y, z)

/**
 * normalizeHand
 * Translate all landmarks so wrist (landmark 0) is at origin,
 * then normalize by the distance from wrist to middle MCP (landmark 9).
 * This makes the features scale-invariant and position-invariant.
 */
function normalizeHand(landmarks) {
  const wrist = landmarks[0]
  const ref   = landmarks[9]
  const dist  = Math.hypot(ref.x - wrist.x, ref.y - wrist.y, ref.z - wrist.z) || 1
  const flat  = []
  for (const pt of landmarks) {
    flat.push((pt.x - wrist.x) / dist, (pt.y - wrist.y) / dist, (pt.z - wrist.z) / dist)
  }
  return flat // length = 63
}

/**
 * buildModel
 * Small dense network: Input(63) → Dense(128) → Dropout(0.3) → Dense(64) → Dense(10)
 */
function buildModel() {
  const model = tf.sequential()
  model.add(tf.layers.dense({ inputShape: [NUM_FEATURES], units: 128, activation: 'relu' }))
  model.add(tf.layers.dropout({ rate: 0.3 }))
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: NUM_CLASSES, activation: 'softmax' }))

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy'],
  })

  return model
}

/**
 * useTFModel
 * 
 * Exposes:
 *   collectSample(landmarks, signIndex) — record a training sample
 *   trainModel()                        — train on collected data, returns accuracy
 *   predict(landmarks)                  — returns { sign, confidence, scores }
 *   downloadData()                      — export collected JSON for external training
 *   samples, trained, training
 */
export const useTFModel = () => {
  const modelRef = useRef(null)
  const [samples, setSamples] = useState([])       // { features: float[], label: int }[]
  const [trained, setTrained] = useState(false)
  const [training, setTraining] = useState(false)
  const [trainLog, setTrainLog] = useState('')

  // ── Collect a training sample ──────────────────────────────────────────────
  const collectSample = useCallback((landmarks, signIndex) => {
    if (!landmarks || landmarks.length !== 21) return
    const features = normalizeHand(landmarks)
    setSamples(prev => [...prev, { features, label: signIndex }])
  }, [])

  // ── Train the model on collected samples ───────────────────────────────────
  const trainModel = useCallback(async () => {
    if (samples.length < 20) {
      setTrainLog('Need at least 20 samples before training.')
      return
    }

    setTraining(true)
    setTrained(false)

    const xs = tf.tensor2d(samples.map(s => s.features))
    const ys = tf.tensor1d(samples.map(s => s.label), 'int32')

    const model = buildModel()
    modelRef.current = model

    await model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          setTrainLog(`Epoch ${epoch + 1}/50 · loss: ${logs.loss.toFixed(4)} · acc: ${(logs.acc * 100).toFixed(1)}%`)
        },
      },
    })

    xs.dispose()
    ys.dispose()

    setTraining(false)
    setTrained(true)
    setTrainLog('✓ Training complete!')
  }, [samples])

  // ── Run inference on a single hand's landmarks ─────────────────────────────
  const predict = useCallback((landmarks) => {
    if (!modelRef.current || !trained || !landmarks || landmarks.length !== 21) return null

    const features = normalizeHand(landmarks)
    const input  = tf.tensor2d([features])
    const output = modelRef.current.predict(input)
    const scores = Array.from(output.dataSync())
    const maxIdx = scores.indexOf(Math.max(...scores))

    input.dispose()
    output.dispose()

    return {
      sign:       SIGN_LABELS[maxIdx],
      signIndex:  maxIdx,
      confidence: scores[maxIdx],
      scores,
    }
  }, [trained])

  // ── Download collected training data as JSON ───────────────────────────────
  const downloadData = useCallback(() => {
    const blob = new Blob([JSON.stringify({ labels: SIGN_LABELS, samples }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jutsu_training_data.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [samples])

  return { collectSample, trainModel, predict, downloadData, samples, trained, training, trainLog, SIGN_LABELS }
}

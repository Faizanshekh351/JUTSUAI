import { useRef, useState, useCallback, useEffect } from 'react'
import * as tf from '@tensorflow/tfjs'
import { extractAndNormalizeData } from '../utils/handData'

// ─── Label map ──────────────────────────────────────────────────────────────
// ─── Label maps ─────────────────────────────────────────────────────────────
// If you upload an 11-class multi-class model later, it will use this array
export const SIGN_LABELS = ['Snake', 'Ram', 'Monkey', 'Boar', 'Horse', 'Tiger', 'Dog', 'Ox', 'Rabbit', 'Bird', 'Idle', 'Shadow Clone']

// The current single-class binary model uses this:
const BINARY_LABEL    = 'Shadow Clone'
const CONFIDENCE_GATE = 0.65  // below this → "Scanning..."

/**
 * patchModelJSON
 *
 * Fixes two Keras 3 → TF.js incompatibilities:
 *
 * 1. InputLayer uses "batch_shape" but TF.js needs "batch_input_shape"
 * 2. Weight names are prefixed "sequential/dense/..." but TF.js matches
 *    against the bare layer name "dense/kernel", so we strip the model prefix.
 */
function patchModelJSON(modelJSON) {
  // Deep-clone via JSON round-trip so we don't mutate the original
  const patched = JSON.parse(JSON.stringify(modelJSON))

  // ── Fix 1: InputLayer batch_shape → batch_input_shape ───────────────────
  const layers = patched?.modelTopology?.model_config?.config?.layers ?? []
  for (const layer of layers) {
    if (layer.class_name === 'InputLayer' && layer.config?.batch_shape) {
      layer.config.batch_input_shape = layer.config.batch_shape
      delete layer.config.batch_shape
    }
  }

  // ── Fix 2: Strip "sequential/" (or any model-name prefix) from weight names
  // Keras 3 uses "sequential/dense/kernel"; TF.js expects "dense/kernel"
  const manifests = patched?.weightsManifest ?? []
  for (const manifest of manifests) {
    for (const w of manifest.weights ?? []) {
      // Remove leading "sequential/" or "model_name/" prefix
      w.name = w.name.replace(/^[^/]+\//, '')
    }
  }

  return patched
}

/**
 * useLoadedModel
 *
 * Loads the Keras/TF.js model from /model/model.json (which is in public/).
 * Patches Keras 3 → TF.js incompatibilities on the fly.
 * Exposes:
 *   predict(multiHandLandmarks) → { sign, confidence, raw } | null
 *   modelStatus  — 'loading' | 'ready' | 'error'
 */
export const useLoadedModel = () => {
  const modelRef   = useRef(null)
  const [modelStatus, setModelStatus] = useState('loading')

  // Load once on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 1. Fetch the JSON ourselves so we can patch it
        const resp = await fetch('/model/model.json')
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching model.json`)
        const rawJSON = await resp.json()

        // 2. Auto-Detect: Is this a Python Keras Model or a Native Browser Model?
        if (rawJSON.generatedBy && rawJSON.generatedBy.includes('tfjs-layers')) {
          // Native Web Model: No patches needed, load instantly!
          const model = await tf.loadLayersModel('/model/model.json')
          if (!cancelled) {
            modelRef.current = model
            setModelStatus('ready')
            console.log('> [useLoadedModel] Native Web Model loaded ✓')
          }
          return
        }

        // 3. Patch Keras 3 incompatibilities
        const patchedJSON = patchModelJSON(rawJSON)

        // 4. Build a custom IOHandler so TF.js still fetches the .bin from /model/
        const ioHandler = {
          load: async () => {
            // Dynamically read the binary filename from the model.json manifest
            const weightFileName = patchedJSON.weightsManifest[0].paths[0]
            const weightsResp = await fetch(`/model/${weightFileName}`)
            if (!weightsResp.ok) throw new Error(`HTTP ${weightsResp.status} fetching weights`)
            const weightsBuffer = await weightsResp.arrayBuffer()

            return {
              modelTopology:   patchedJSON.modelTopology,
              weightSpecs:     patchedJSON.weightsManifest[0].weights,
              weightData:      weightsBuffer,
              trainingConfig:  patchedJSON.modelTopology?.training_config ?? null,
              format:          patchedJSON.format,
              generatedBy:     patchedJSON.generatedBy,
              convertedBy:     patchedJSON.convertedBy,
            }
          }
        }

        const model = await tf.loadLayersModel(ioHandler)

        if (!cancelled) {
          modelRef.current = model
          setModelStatus('ready')
          console.log('> [useLoadedModel] Python Keras Model loaded ✓')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('> [useLoadedModel] Failed to load model:', err)
          setModelStatus('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  /**
   * predict
   * @param {Array} multiHandLandmarks  — the smoothed array from MediaPipe
   * @param {Array} multiHandedness     — the handedness array from MediaPipe
   * @returns {{ sign: string, confidence: number, raw: number } | null}
   */
  // ── Predict ───────────────────────────────────────────────────────────────
  const predict = useCallback((multiHandLandmarks) => {
    if (modelStatus !== 'ready' || !modelRef.current || !multiHandLandmarks) {
      return null
    }

    // Build the 126-float feature vector (same normalisation as training)
    const features = extractAndNormalizeData(multiHandLandmarks)
    if (features.length === 0) return null

    let scores
    try {
      const input  = tf.tensor2d([features])              // shape [1, 126]
      const output = modelRef.current.predict(input)
      scores       = Array.from(output.dataSync())
      input.dispose()
      output.dispose()
    } catch (err) {
      console.warn('> [useLoadedModel] Inference error:', err)
      return null
    }

    // ── Auto-Detect Model Type (Binary vs Multi-Class) ──────────────────
    if (scores.length === 1) {
      // Binary sigmoid model (Your current setup)
      const confidence = scores[0]
      const sign       = confidence >= CONFIDENCE_GATE ? BINARY_LABEL : '?'
      return { sign, confidence, raw: confidence }
    } else {
      // Multi-class softmax model
      let maxIdx = 0
      let maxConfidence = scores[0]
      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > maxConfidence) {
          maxConfidence = scores[i]
          maxIdx = i
        }
      }
      
      // Explicit X-Ray Debug Mode requested from the tutorial
      if (maxConfidence > 0.05) { // Only log if it's doing something
         console.log(`>> [X-RAY]: AI Sees Class [${maxIdx}] with Confidence: ${(maxConfidence * 100).toFixed(1)}% | Hands Visible: ${multiHandLandmarks.length}`)
      }
      
      const winningLabel = SIGN_LABELS[maxIdx]
      // If the model predicts 'Idle', it means hands are visible but no sign is being formed
      const sign = (winningLabel === 'Idle' || maxConfidence < CONFIDENCE_GATE) ? '?' : winningLabel
      return { sign, confidence: maxConfidence, scores }
    }
  }, [modelStatus])

  return { predict, modelStatus }
}

const c = require('compact-encoding')
const m = require('bare-rpc/messages')
const { encodeFrame, toHex, serializeDescriptor } = require('./frame')

const FAMILIES = ['envelope', 'error', 'boundary', 'negative', 'decode-only', 'sequence']

// Cases the 0.1 frames.json and messages.json files never carried. Those files
// stay as they were until every port reads cases.json and answers.json.
const NOT_IN_OLD_FILES = new Set(['stream-error-and-data-flags'])

function toDescriptor(value) {
  const descriptor = { ...value, data: value.data === null ? null : Buffer.from(value.data, 'hex') }
  if (value.error) descriptor.error = { ...value.error }
  return descriptor
}

function decode(buf) {
  return serializeDescriptor(m.message.decode(c.state(0, buf.length, buf)))
}

function answer(input) {
  if ('bytes' in input) {
    try {
      return { decodes: decode(Buffer.from(input.bytes, 'hex')) }
    } catch {
      return { rejects: true }
    }
  }

  if (Array.isArray(input.value)) {
    const frames = input.value.map((value) => encodeFrame(toDescriptor(value)))
    return { hex: toHex(Buffer.concat(frames)), decodes: frames.map(decode) }
  }

  const frame = encodeFrame(toDescriptor(input.value))
  return { hex: toHex(frame), decodes: decode(frame) }
}

function answers(cases) {
  return Object.fromEntries(cases.map((c) => [c.id, answer(c.input)]))
}

function oldFiles(family, cases, answers) {
  const kept = cases.filter((c) => !NOT_IN_OLD_FILES.has(c.id))

  if (family === 'negative') {
    return { 'frames.json': kept.map((c) => ({ hex: c.input.bytes, reason: c.note })) }
  }

  if (family === 'decode-only') {
    return {
      'frames.json': kept.map((c) => ({
        hex: c.input.bytes,
        descriptor: answers[c.id].decodes,
        reason: c.note
      }))
    }
  }

  if (family === 'sequence') {
    const [c] = kept
    return { 'frames.json': { concatenated: answers[c.id].hex, count: c.input.value.length } }
  }

  return {
    'frames.json': kept.map((c) => answers[c.id].hex),
    'messages.json': kept.map((c) => ({ note: c.note, descriptor: answers[c.id].decodes }))
  }
}

module.exports = { FAMILIES, answer, answers, oldFiles }

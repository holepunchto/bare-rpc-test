const fs = require('fs')
const path = require('path')
const { encodeFrame, toHex, decodeFrame, serializeDescriptor } = require('./lib/frame')
const { ENVELOPE, ERROR, BOUNDARY, SEQUENCE } = require('./lib/cases')

function writeFamily(dir, cases) {
  fs.mkdirSync(dir, { recursive: true })
  const frames = cases.map((c) => encodeFrame(c.descriptor))
  // messages.json describes what each frame decodes to, not the input
  // descriptor: a stream=0 null payload goes on the wire as dataLen=0 and
  // decodes to an empty buffer, never null. Deriving from the decoded frame
  // keeps the description honest about wire reality for every case.
  const messages = frames.map((frame, i) => ({
    note: cases[i].note,
    descriptor: serializeDescriptor(decodeFrame(frame))
  }))
  fs.writeFileSync(path.join(dir, 'messages.json'), JSON.stringify(messages, null, 2) + '\n')
  fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify(frames.map(toHex), null, 2) + '\n')
}

writeFamily(path.join(__dirname, 'fixtures', 'envelope'), ENVELOPE)
console.log('generated envelope fixtures')

writeFamily(path.join(__dirname, 'fixtures', 'error'), ERROR)
console.log('generated error fixtures')

writeFamily(path.join(__dirname, 'fixtures', 'boundary'), BOUNDARY)
console.log('generated boundary fixtures')

const seq = Buffer.concat(SEQUENCE.map(encodeFrame))
fs.mkdirSync(path.join(__dirname, 'fixtures', 'sequence'), { recursive: true })
fs.writeFileSync(
  path.join(__dirname, 'fixtures', 'sequence', 'frames.json'),
  JSON.stringify({ concatenated: toHex(seq), count: SEQUENCE.length }, null, 2) + '\n'
)
console.log('generated sequence fixture')

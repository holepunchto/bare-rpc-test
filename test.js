const fs = require('fs')
const path = require('path')
const test = require('brittle')
const c = require('compact-encoding')
const { encodeFrame, toHex, decodeFrame, serializeDescriptor } = require('./lib/frame')
const { ENVELOPE, ERROR, BOUNDARY } = require('./lib/cases')
const { families, loadFamily, loadSequence, loadNegative, loadDecodeOnly } = require('.')

// The cross-language contract is the (frames.json, messages.json) pair: a
// foreign implementation reads messages.json as the description of the bytes in
// frames.json. Assert every committed frame decodes back to exactly its
// committed description - this validates the decode direction and that the two
// files agree. serializeDescriptor is the same projection generate.js uses, so
// a decoded message maps into the identical JSON shape messages.json stores.
test('messages.json describes frames.json (decode round-trips)', function (t) {
  for (const family of families) {
    const { frames, messages } = loadFamily(family)
    t.is(frames.length, messages.length, family + ': one frame per message')
    for (let i = 0; i < frames.length; i++) {
      const decoded = serializeDescriptor(decodeFrame(Buffer.from(frames[i], 'hex')))
      t.alike(decoded, messages[i].descriptor, family + ': ' + messages[i].note)
    }
  }
})

test('envelope: generated frames match committed fixtures', function (t) {
  const { frames } = loadFamily('envelope')
  t.is(frames.length, ENVELOPE.length, 'one frame per case')
  for (let i = 0; i < ENVELOPE.length; i++) {
    t.is(toHex(encodeFrame(ENVELOPE[i].descriptor)), frames[i], ENVELOPE[i].note)
  }
})

test('envelope: every frame decodes without throwing', function (t) {
  const { frames } = loadFamily('envelope')
  for (let i = 0; i < frames.length; i++) {
    const buf = Buffer.from(frames[i], 'hex')
    const msg = decodeFrame(buf)
    t.ok(msg && typeof msg.type === 'number', ENVELOPE[i].note + ' decodes')
  }
})

test('envelope: zero-length buffer decodes to an empty Buffer, not null', function (t) {
  const { frames } = loadFamily('envelope')
  const index = ENVELOPE.findIndex((c) => c.note.includes('zero-length buffer'))
  t.ok(index !== -1, 'zero-length buffer case exists')
  const buf = Buffer.from(frames[index], 'hex')
  const { data } = decodeFrame(buf)
  t.ok(Buffer.isBuffer(data), 'zero-length payload decodes to a Buffer, not null')
  t.is(data.length, 0, 'zero-length payload decodes to an empty buffer')
})

test('error: frames match and codes decode as expected', function (t) {
  const { frames } = loadFamily('error')
  for (let i = 0; i < ERROR.length; i++) {
    const cse = ERROR[i]
    t.is(toHex(encodeFrame(cse.descriptor)), frames[i], cse.note + ' frame')
    const msg = decodeFrame(Buffer.from(frames[i], 'hex'))
    if ('expectCode' in cse) t.is(msg.error.code, cse.expectCode, cse.note + ' code')
  }
})

test('boundary: frames match and re-decode', function (t) {
  const { frames } = loadFamily('boundary')
  for (let i = 0; i < BOUNDARY.length; i++) {
    t.is(toHex(encodeFrame(BOUNDARY[i].descriptor)), frames[i], BOUNDARY[i].note)
    const msg = decodeFrame(Buffer.from(frames[i], 'hex'))
    t.is(msg.id, BOUNDARY[i].descriptor.id, BOUNDARY[i].note + ' id')
    t.is(msg.command, BOUNDARY[i].descriptor.command, BOUNDARY[i].note + ' command')
    t.is(
      msg.data ? msg.data.length : 0,
      BOUNDARY[i].descriptor.data ? BOUNDARY[i].descriptor.data.length : 0,
      BOUNDARY[i].note + ' data length'
    )
  }
})

test('sequence: concatenated frames re-split by length prefix', function (t) {
  const { concatenated, count } = loadSequence()
  const buf = Buffer.from(concatenated, 'hex')
  const state = c.state(0, buf.length, buf)
  let seen = 0
  const m = require('bare-rpc/messages')
  while (state.start < state.end) {
    const msg = m.message.decode(state)
    t.ok(msg, 'frame ' + seen)
    seen++
  }
  t.is(seen, count, 'all frames re-split')
})

for (const { hex, reason } of loadNegative()) {
  test('negative: rejected - ' + reason, function (t) {
    // t.exception.all (not plain t.exception): the decoder throws native
    // RangeError/TypeError, which brittle's plain t.exception treats as an
    // uncaught programmer error rather than an expected exception.
    t.exception.all(() => decodeFrame(Buffer.from(hex, 'hex')), reason)
  })
}

for (const { hex, descriptor, reason } of loadDecodeOnly()) {
  test('decode-only: ' + reason, function (t) {
    t.alike(serializeDescriptor(decodeFrame(Buffer.from(hex, 'hex'))), descriptor)
  })
}

test('WIRE.md names the bare-rpc the fixtures are generated from', function (t) {
  const pinned = require('./package.json').devDependencies['bare-rpc']
  t.ok(/^\d+\.\d+\.\d+$/.test(pinned), 'bare-rpc is pinned to one version')
  t.is(require('bare-rpc/package').version, pinned, 'the installed bare-rpc is the pinned one')

  const spec = fs.readFileSync(path.join(__dirname, 'WIRE.md'), 'utf8')
  t.is(spec.match(/version (\d+\.\d+\.\d+)/)[1], pinned, 'WIRE.md names the pinned one')
})

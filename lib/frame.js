const c = require('compact-encoding')
const m = require('bare-rpc/messages')

// Encode one message descriptor to a full wire frame (header bytes + payload
// bytes). c.encode(m.header, ...) sizes the frame length to include the
// payload but does not write the payload itself, so concat it here.
function encodeFrame(descriptor) {
  const header = c.encode(m.header, descriptor)
  if (descriptor.data) return Buffer.concat([header, descriptor.data])
  return Buffer.from(header)
}

function toHex(buf) {
  return Buffer.from(buf).toString('hex')
}

// Project a wire descriptor (or a decoded message) into the canonical JSON
// shape stored in messages.json. Reads d.error.message explicitly because a
// decoded error is a real Error instance whose `message` is non-enumerable, so
// a spread/deep-compare would silently drop it.
function serializeDescriptor(d) {
  const out = { ...d }
  // Buffer.isBuffer (not `if (d.data)`) so a zero-length buffer serializes as
  // "" (empty buffer on the wire), distinct from null (no payload field).
  out.data = Buffer.isBuffer(d.data) ? toHex(d.data) : null
  // Normalize so an undefined code (which JSON.stringify would drop) is
  // recorded as the empty string that actually goes on the wire.
  if ('error' in d && d.error) {
    out.error = { message: d.error.message, code: d.error.code ?? '', errno: d.error.errno }
  }
  return out
}

// Decode a frame back to a message (used by the round-trip test).
function decodeFrame(buf) {
  return m.message.decode(c.state(0, buf.length, buf))
}

module.exports = { encodeFrame, toHex, decodeFrame, serializeDescriptor }

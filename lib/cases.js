const c = require('compact-encoding')

// A few reusable payloads.
const p = {
  empty: null,
  small: Buffer.from('hi'),
  uintField: c.encode(c.uint, 42) // a one-field struct payload stand-in
}

// Stream flag masks (from bare-rpc/lib/constants.js), pre-combined with the
// direction bit. REQUEST direction = 0x100, RESPONSE direction = 0x200.
const S = {
  reqOpen: 0x101,
  resOpen: 0x201,
  reqData: 0x110,
  resData: 0x210,
  reqEnd: 0x120,
  resEnd: 0x220,
  reqClose: 0x102,
  resClose: 0x202,
  reqCloseErr: 0x182,
  resCloseErr: 0x282,
  reqResume: 0x108,
  resResume: 0x208,
  reqPause: 0x104,
  resPause: 0x204,
  reqDestroy: 0x140,
  resDestroy: 0x240,
  reqDestroyErr: 0x1c0,
  resDestroyErr: 0x2c0
}

const ENVELOPE = [
  // REQUEST (type 1)
  {
    note: 'request unary with payload',
    descriptor: { type: 1, id: 1, command: 0, stream: 0, data: p.small }
  },
  {
    note: 'request unary null payload',
    descriptor: { type: 1, id: 1, command: 0, stream: 0, data: null }
  },
  {
    note: 'request unary zero-length buffer (decodes to empty buffer, not null)',
    descriptor: { type: 1, id: 1, command: 0, stream: 0, data: Buffer.alloc(0) }
  },
  {
    note: 'event (id 0) with payload',
    descriptor: { type: 1, id: 0, command: 3, stream: 0, data: p.small }
  },
  {
    note: 'event (id 0) null payload',
    descriptor: { type: 1, id: 0, command: 3, stream: 0, data: null }
  },
  {
    note: 'request stream-open (stream=0x1, no dataLen field)',
    descriptor: { type: 1, id: 2, command: 1, stream: 0x1, data: null }
  },

  // RESPONSE (type 2)
  {
    note: 'response success with payload',
    descriptor: { type: 2, id: 1, error: null, stream: 0, data: p.small }
  },
  {
    note: 'response success null payload',
    descriptor: { type: 2, id: 1, error: null, stream: 0, data: null }
  },
  {
    note: 'response stream-open (stream=0x1)',
    descriptor: { type: 2, id: 2, error: null, stream: 0x1, data: null }
  },

  // STREAM (type 3) - data frames
  {
    note: 'stream request data',
    descriptor: { type: 3, id: 2, stream: S.reqData, error: null, data: p.small }
  },
  {
    note: 'stream response data',
    descriptor: { type: 3, id: 2, stream: S.resData, error: null, data: p.small }
  },
  // STREAM control frames (no trailing fields)
  {
    note: 'stream request open',
    descriptor: { type: 3, id: 2, stream: S.reqOpen, error: null, data: null }
  },
  {
    note: 'stream response open',
    descriptor: { type: 3, id: 2, stream: S.resOpen, error: null, data: null }
  },
  {
    note: 'stream request end',
    descriptor: { type: 3, id: 2, stream: S.reqEnd, error: null, data: null }
  },
  {
    note: 'stream response end',
    descriptor: { type: 3, id: 2, stream: S.resEnd, error: null, data: null }
  },
  {
    note: 'stream request close',
    descriptor: { type: 3, id: 2, stream: S.reqClose, error: null, data: null }
  },
  {
    note: 'stream request pause',
    descriptor: { type: 3, id: 2, stream: S.reqPause, error: null, data: null }
  },
  {
    note: 'stream request resume',
    descriptor: { type: 3, id: 2, stream: S.reqResume, error: null, data: null }
  },
  {
    note: 'stream request destroy',
    descriptor: { type: 3, id: 2, stream: S.reqDestroy, error: null, data: null }
  },
  // response-direction control frames. Error-bearing stream masks (reqCloseErr/resCloseErr/reqDestroyErr/resDestroyErr) are exercised in the error family (Task 4).
  {
    note: 'stream response close',
    descriptor: { type: 3, id: 2, stream: S.resClose, error: null, data: null }
  },
  {
    note: 'stream response pause',
    descriptor: { type: 3, id: 2, stream: S.resPause, error: null, data: null }
  },
  {
    note: 'stream response resume',
    descriptor: { type: 3, id: 2, stream: S.resResume, error: null, data: null }
  },
  {
    note: 'stream response destroy',
    descriptor: { type: 3, id: 2, stream: S.resDestroy, error: null, data: null }
  }
]

const ERROR = [
  {
    note: 'response error basic',
    descriptor: {
      type: 2,
      id: 1,
      error: { message: 'boom', code: 'BAD', errno: 400 },
      stream: 0,
      data: null
    }
  },
  {
    note: 'response error empty message and code',
    descriptor: {
      type: 2,
      id: 1,
      error: { message: '', code: '', errno: 0 },
      stream: 0,
      data: null
    }
  },
  {
    note: 'response error negative errno',
    descriptor: {
      type: 2,
      id: 1,
      error: { message: 'x', code: 'C', errno: -400 },
      stream: 0,
      data: null
    }
  },
  {
    note: 'response error unicode message',
    descriptor: {
      type: 2,
      id: 1,
      error: { message: 'nafta éè', code: 'C', errno: 1 },
      stream: 0,
      data: null
    }
  },
  {
    note: 'response error null code encodes empty (regression)',
    descriptor: {
      type: 2,
      id: 1,
      error: { message: 'm', code: null, errno: 1 },
      stream: 0,
      data: null
    },
    expectCode: ''
  },
  {
    note: 'response error undefined code encodes empty (regression)',
    descriptor: {
      type: 2,
      id: 1,
      error: { message: 'm', code: undefined, errno: 1 },
      stream: 0,
      data: null
    },
    expectCode: ''
  },
  {
    note: 'stream request close+error',
    descriptor: {
      type: 3,
      id: 2,
      stream: S.reqCloseErr,
      error: { message: 'gone', code: 'E', errno: 1 },
      data: null
    }
  },
  {
    note: 'stream response destroy+error',
    descriptor: {
      type: 3,
      id: 2,
      stream: S.resDestroyErr,
      error: { message: 'gone', code: 'E', errno: 2 },
      data: null
    }
  },
  {
    note: 'stream response close+error',
    descriptor: {
      type: 3,
      id: 2,
      stream: S.resCloseErr,
      error: { message: 'gone', code: 'E', errno: 3 },
      data: null
    }
  },
  {
    note: 'stream request destroy+error',
    descriptor: {
      type: 3,
      id: 2,
      stream: S.reqDestroyErr,
      error: { message: 'gone', code: 'E', errno: 4 },
      data: null
    }
  }
]

const BOUNDARY = [
  {
    note: 'id 252 (1-byte varint max)',
    descriptor: { type: 1, id: 252, command: 0, stream: 0, data: null }
  },
  {
    note: 'id 253 (varint widens to 3 bytes)',
    descriptor: { type: 1, id: 253, command: 0, stream: 0, data: null }
  },
  {
    note: 'id 65536 (varint widens to 5 bytes)',
    descriptor: { type: 1, id: 65536, command: 0, stream: 0, data: null }
  },
  {
    note: 'id 4294967296 (2^32, varint widens to 9 bytes / uint64 tag 0xff)',
    descriptor: { type: 1, id: 4294967296, command: 0, stream: 0, data: null }
  },
  { note: 'command 253', descriptor: { type: 1, id: 1, command: 253, stream: 0, data: null } },
  {
    note: 'dataLen 252',
    descriptor: { type: 1, id: 1, command: 0, stream: 0, data: Buffer.alloc(252, 7) }
  },
  {
    note: 'dataLen 253 (varint widens)',
    descriptor: { type: 1, id: 1, command: 0, stream: 0, data: Buffer.alloc(253, 7) }
  }
]

// One request id's worth of stream frames in wire order: open, two data
// frames, then end. Used to build a single concatenated multi-frame stream
// that a decoder must re-split by length prefix (Task 6).
const SEQUENCE = [
  { type: 3, id: 5, stream: S.resOpen, error: null, data: null },
  { type: 3, id: 5, stream: S.resData, error: null, data: Buffer.from('a') },
  { type: 3, id: 5, stream: S.resData, error: null, data: Buffer.from('b') },
  { type: 3, id: 5, stream: S.resEnd, error: null, data: null }
]

module.exports = { ENVELOPE, ERROR, BOUNDARY, SEQUENCE, S, p }

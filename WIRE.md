# Wire format

This document is the normative definition of the bare-rpc wire protocol. It is checked against the reference implementation in `bare-rpc` (`lib/messages.js` and `lib/constants.js`, version 1.3.8), not against any other documentation, and every rule below has a corresponding machine-checkable vector under `fixtures/`. Where this document and `fixtures/` disagree, `fixtures/` wins; file an issue and fix the prose. One fixture departs from that version: for a STREAM with both `ERROR` and `DATA` set, `bare-rpc` writes the payload past the frame (holepunchto/bare-rpc#43), and `stream-error-and-data-flags` follows `stream-error-excludes-data` instead.

Each rule carries a stable slug, written as a list item: ``- `slug` - the rule.`` A slug does not change when the prose around it moves or is reworded.

## Framing

Every message is a single frame: a length prefix, then a body of that many bytes. An encoder reserves the 4 prefix bytes, encodes the body after them, then writes the body's byte count into the reserved bytes once it is known.

- `frame-length-prefix` - a frame is a `uint32` little-endian length followed by that many bytes of body; the length counts every byte after the prefix and excludes the prefix's own 4 bytes.
- `frame-truncated-rejects` - a decoder rejects a frame whose length promises more bytes than follow it.
- `frame-leftover-ignored` - bytes the length covers beyond a body's last field are ignored, whatever the message type; the length alone decides where the next frame starts.
- `frames-concatenate` - frames concatenated into one buffer are split by their length prefixes alone.

## Fields

Every field after the frame length is a `compact-encoding` value, and this document does not restate how those encode. They are specified by [compact-encoding-test's `CODECS.md`](https://github.com/holepunchto/compact-encoding-test/blob/v0.2.0/CODECS.md) 0.2.0, including what a decoder does with an integer wider than its value needs, with a byte other than `00` or `01` where it reads a boolean, and with bytes that are not valid UTF-8.

- `fields-compact-encoding` - after the frame length, `errno` is an `int` and every other integer a `uint`, `hasError` is a `bool`, every string is a `utf8`, and every payload is a `buffer` - a `uint` byte count followed by that many bytes - each as compact-encoding-test's `CODECS.md` defines it.

## Message types

The frame body opens with two fields common to every message, `type` and `id`. `type` selects one of three message shapes, and the remaining fields depend on it.

```
type: REQUEST = 1
type: RESPONSE = 2
type: STREAM = 3
```

- `message-header` - a body opens with `type` then `id`, and `type` is 1 (REQUEST), 2 (RESPONSE) or 3 (STREAM).
- `message-unknown-type-rejects` - a decoder rejects a `type` outside 1-3 rather than skipping the frame; see [Rejecting frames](#rejecting-frames).
- `event-id-zero` - a REQUEST whose `id` is 0 is an event.

### REQUEST (`type = 1`)

- `request-fields` - a REQUEST is `type, id, command, stream`, followed by `dataLen, data` only when `stream` is 0.

### RESPONSE (`type = 2`)

- `response-fields` - a RESPONSE is `type, id, hasError, stream`, followed by the error struct when `hasError` is true, by `dataLen, data` when it is false and `stream` is 0, and by nothing otherwise.

### STREAM (`type = 3`)

`stream` is a set of flags, described in [Stream flags](#stream-flags). The flags, not the bytes left in the frame, decide whether a payload follows.

- `stream-fields` - a STREAM is `type, id, stream`, followed by the error struct when `ERROR` is set, by `dataLen, data` when `DATA` is set and `ERROR` is not, and by nothing otherwise.
- `stream-error-excludes-data` - a STREAM with both `ERROR` and `DATA` set carries the error struct and no payload.

## Stream flags

`stream` is a bitmask. The low byte names the stream action; bits `0x100` and `0x200` mark the direction the frame flows in, from the requester or from the responder. The two groups combine by OR:

| Bit     | Name     | Meaning                               |
| ------- | -------- | ------------------------------------- |
| `0x1`   | OPEN     | open a stream                         |
| `0x2`   | CLOSE    | close a stream                        |
| `0x4`   | PAUSE    | pause a stream                        |
| `0x8`   | RESUME   | resume a stream                       |
| `0x10`  | DATA     | this frame carries payload data       |
| `0x20`  | END      | end of stream                         |
| `0x40`  | DESTROY  | destroy a stream                      |
| `0x80`  | ERROR    | this frame carries an error struct    |
| `0x100` | REQUEST  | frame flows in the request direction  |
| `0x200` | RESPONSE | frame flows in the response direction |

Three encodings carry `OPEN`, and they are not interchangeable. The side that owns a REQUEST or RESPONSE opens its stream on that message; the receiving side acknowledges on a STREAM; and every later frame on the stream is a STREAM as well. For example a response-side data frame is `RESPONSE | DATA = 0x210`, and a request-side close with an error is `REQUEST | CLOSE | ERROR = 0x182`.

- `stream-flag-bits` - the flags take the values in the table above, combined by OR.
- `stream-open-initiator` - the side that owns a REQUEST or RESPONSE opens its stream by sending that message with `stream` set to exactly `0x1`, no direction bit and no other action bit.
- `stream-open-receiver` - the receiving side acknowledges with a STREAM whose flags are one direction bit OR `OPEN` and no other action bit: `0x101` in the request direction, `0x201` in the response direction.
- `stream-direction` - every other STREAM frame ORs one direction bit with one or more action bits other than `OPEN`.

## Error struct

When a frame carries an error (a RESPONSE with `hasError`, or a STREAM with the `ERROR` bit set), the struct follows the fields above with no framing of its own:

```
message: utf8
code: utf8
errno: int
```

The field is named `errno`, not `status`.

- `error-struct` - an error is `message`, `code` and `errno`, in that order, one directly after another.
- `error-code-string` - `code` is always a string, and an error without a code carries the empty string rather than omitting the field.

## Payload handling

Whether a frame carries `dataLen, data` at all depends on `stream`, as described above.

- `payload-stream-zero` - a frame whose `stream` is 0 always carries `dataLen, data`, and a payload of zero bytes decodes to an empty buffer, never to no payload.
- `payload-control-none` - a frame whose `stream` is not 0 and has neither `DATA` nor `ERROR` set carries no `dataLen`, and decodes to no payload.

## Rejecting frames

A decoder rejects two distinct classes of input, and in both it must signal the failure to its caller rather than skip the frame and carry on:

- **Malformed** - the frame cannot be parsed at all: the length promises more bytes than follow (`frame-truncated-rejects`), or a field runs past the end of the body (`field-past-end-rejects`).
- **Unrecognized** - the frame parses, but names something this format does not define. The only such case today is a `type` outside 1-3 (`message-unknown-type-rejects`).

- `field-past-end-rejects` - a decoder rejects a body whose fields run past its end.

The second class is an error rather than something to ignore because the type space is closed: a peer sending a type this format does not define is either corrupt or not speaking this protocol, and continuing past it silently hides both. Adding a message type is a coordinated change across implementations, not something a decoder absorbs on its own. Returning "no message" and reading the next frame does not satisfy either class.

## Fixtures

`fixtures/` is the machine-checkable form of every rule in this document: `envelope/` covers the three message types and payload/null semantics, `error/` covers the error struct, `boundary/` covers ids, commands and payload lengths at the widths where their `uint` grows, `negative/` covers both classes of input a decoder must reject, `decode-only/` covers frames a decoder must accept but that do not re-encode to the same bytes, and `sequence/` covers a multi-frame stream concatenated into one buffer. Each family's `frames.json` holds the canonical hex bytes (`decode-only/` holds accepted but non-canonical ones) and `messages.json` (or the family's own structure) holds the decoded message each frame corresponds to. An implementation is wire-conformant if it can decode every fixture frame into the described message and re-encode every described message into the exact fixture frame, except `decode-only/`, whose frames it need only decode.

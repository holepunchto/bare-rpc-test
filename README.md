# bare-rpc-test

Cross-language conformance vectors, normative spec and reference peer for bare-rpc.

```
npm i bare-rpc-test
```

`WIRE.md` is the normative wire format, and `fixtures/` holds canonical byte vectors generated from the reference `bare-rpc` implementation. Where the two disagree, `fixtures/` wins. A port proves wire compatibility by decoding each fixture's frame hex into the described message, and re-encoding the message back to the same hex.

Regenerate fixtures with `npm run generate`.

## The fixtures

One directory per family. `fixtures/index.json` lists every family and the ids of its cases.

- `cases.json` - the questions. Each case has an `id`, unique across the corpus, a `note`, the `rules` from `WIRE.md` it exercises, and an `input`. A `value` is a message, or a list of messages for a stream of frames, and asks what it encodes to. `bytes` are hex and ask what a decoder makes of them.
- `answers.json` - the answer to each case, keyed by id, generated from the pinned `bare-rpc`. A `value` is answered by `hex`, the frame bytes, and `decodes`, the message those bytes decode to. `bytes` are answered by `decodes`, or by `rejects: true` where a decoder must signal an error.

A message is written as `type`, `id`, `command` (requests only), `stream`, `error` (responses and stream frames: `message`, `code`, `errno`, or `null`) and `data` (hex, or `null` for none). In an input, `stream` decides whether a frame carries `data` at all, so `decodes` is what to compare against: a `null` payload on a frame whose `stream` is 0 decodes to `""`, and `data` on a frame whose flags carry no payload decodes to `null`. An input's `code` may be `null` or absent, and decodes to `""`.

`frames.json` and `messages.json`, and the `negative`, `decode-only` and `sequence` files of the same name, are the 0.1 format, generated from the same cases, without the cases added since, until every port reads `cases.json` and `answers.json`.

## License

Apache-2.0

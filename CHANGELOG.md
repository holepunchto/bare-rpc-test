# Changelog

## 0.1.0

Initial release. The bare-rpc wire vectors and wire format, moved from `hrpc-test` 0.2.4 with their bytes unchanged (#2).

- `WIRE.md`, the normative bare-rpc wire format.
- Vectors for `envelope`, `error` and `boundary`, each a `frames.json` and `messages.json` pair, plus `negative`, `decode-only` and `sequence`.
- `families`, `fixturesDir`, `loadFamily`, `loadNegative`, `loadDecodeOnly` and `loadSequence`, the same loader API as `hrpc-test`'s, loadable under Bare and Node.

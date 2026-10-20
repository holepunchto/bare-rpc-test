# bare-rpc-test

Cross-language conformance vectors, normative spec and reference peer for bare-rpc.

```
npm i bare-rpc-test
```

`WIRE.md` is the normative wire format, and `fixtures/` holds canonical byte vectors generated from the reference `bare-rpc` implementation. Where the two disagree, `fixtures/` wins. A port proves wire compatibility by decoding each fixture's frame hex into the described message, and re-encoding the message back to the same hex.

Regenerate fixtures with `npm run generate`.

## License

Apache-2.0

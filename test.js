const fs = require('fs')
const path = require('path')
const test = require('brittle')
const { decodeFrame, serializeDescriptor } = require('./lib/frame')
const { FAMILIES, answers, oldFiles } = require('./lib/answers')
const { index, loadCases, loadAnswers, families, loadFamily } = require('.')

const spec = fs.readFileSync(path.join(__dirname, 'WIRE.md'), 'utf8')
const rules = [...spec.matchAll(/^- `([a-z0-9][a-z0-9-]*)` - /gm)].map((m) => m[1])

function read(family, name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', family, name), 'utf8'))
}

test('the index lists every family and its cases in order', function (t) {
  t.alike(Object.keys(index), FAMILIES)
  for (const family of FAMILIES) {
    t.alike(
      index[family],
      loadCases(family).map((c) => c.id),
      family
    )
  }
})

test('case ids are unique across the corpus', function (t) {
  const ids = Object.values(index).flat()
  t.is(new Set(ids).size, ids.length)
})

test('every citation names a rule WIRE.md states', function (t) {
  for (const family of FAMILIES) {
    for (const c of loadCases(family)) {
      t.ok(c.rules.length > 0, c.id + ' cites a rule')
      for (const rule of c.rules) t.ok(rules.includes(rule), c.id + ' cites ' + rule)
    }
  }
})

test('every rule WIRE.md states is cited by a case', function (t) {
  const cited = new Set(FAMILIES.flatMap((family) => loadCases(family).flatMap((c) => c.rules)))
  t.ok(rules.length > 0, 'WIRE.md states rules')
  for (const rule of rules) t.ok(cited.has(rule), rule)
})

test('the committed answers are what the pinned bare-rpc answers', function (t) {
  for (const family of FAMILIES) {
    t.alike(answers(loadCases(family)), loadAnswers(family), family)
  }
})

test('the 0.1 files are generated from the cases', function (t) {
  for (const family of FAMILIES) {
    const files = oldFiles(family, loadCases(family), loadAnswers(family))
    for (const [name, value] of Object.entries(files)) {
      t.alike(value, read(family, name), family + '/' + name)
    }
  }
})

// The 0.1 contract: a port reads messages.json as the description of the
// bytes in frames.json.
test('messages.json describes frames.json', function (t) {
  for (const family of families) {
    const { frames, messages } = loadFamily(family)
    t.is(frames.length, messages.length, family + ': one frame per message')
    for (let i = 0; i < frames.length; i++) {
      const decoded = serializeDescriptor(decodeFrame(Buffer.from(frames[i], 'hex')))
      t.alike(decoded, messages[i].descriptor, family + ': ' + messages[i].note)
    }
  }
})

test('WIRE.md names the bare-rpc the fixtures are generated from', function (t) {
  const pinned = require('./package.json').devDependencies['bare-rpc']
  t.ok(/^\d+\.\d+\.\d+$/.test(pinned), 'bare-rpc is pinned to one version')
  t.is(require('bare-rpc/package').version, pinned, 'the installed bare-rpc is the pinned one')
  t.is(spec.match(/version (\d+\.\d+\.\d+)/)[1], pinned, 'WIRE.md names the pinned one')
})

const fs = require('fs')
const path = require('path')

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

const FAMILIES = readJSON(path.join(__dirname, 'fixtures', 'families.json'))

// { family: [case ids] } for every family carrying cases.json and answers.json.
const INDEX = readJSON(path.join(__dirname, 'fixtures', 'index.json'))

// { id, note, rules, input }[]: the questions a family asks.
function loadCases(name) {
  return readJSON(path.join(__dirname, 'fixtures', name, 'cases.json'))
}

// { [id]: answer }: the format's answer to each of a family's cases.
function loadAnswers(name) {
  return readJSON(path.join(__dirname, 'fixtures', name, 'answers.json'))
}

// Families with {messages.json, frames.json} (index-aligned).
function loadFamily(name) {
  const dir = path.join(__dirname, 'fixtures', name)
  return {
    messages: readJSON(path.join(dir, 'messages.json')),
    frames: readJSON(path.join(dir, 'frames.json'))
  }
}

// {hex, reason}[] a conformant decoder must reject.
function loadNegative() {
  return readJSON(path.join(__dirname, 'fixtures', 'negative', 'frames.json'))
}

// {hex, descriptor, reason}[] a conformant decoder must decode to descriptor;
// the frames do not re-encode to the same bytes.
function loadDecodeOnly() {
  return readJSON(path.join(__dirname, 'fixtures', 'decode-only', 'frames.json'))
}

// { concatenated, count } - one byte stream of several frames.
function loadSequence() {
  return readJSON(path.join(__dirname, 'fixtures', 'sequence', 'frames.json'))
}

module.exports = {
  index: INDEX,
  loadCases,
  loadAnswers,
  families: FAMILIES,
  fixturesDir: path.join(__dirname, 'fixtures'),
  loadFamily,
  loadNegative,
  loadDecodeOnly,
  loadSequence
}

const fs = require('fs')
const path = require('path')
const { FAMILIES, answers, oldFiles } = require('./lib/answers')

const fixtures = path.join(__dirname, 'fixtures')

// The 0.1 negative and decode-only files are formatted by hand; the tests check
// they agree with the cases.
const HAND_WRITTEN = new Set(['negative', 'decode-only'])

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function write(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}

const index = {}

for (const family of FAMILIES) {
  const dir = path.join(fixtures, family)
  const cases = read(path.join(dir, 'cases.json'))
  const committed = answers(cases)

  write(path.join(dir, 'answers.json'), committed)
  if (!HAND_WRITTEN.has(family)) {
    for (const [name, value] of Object.entries(oldFiles(family, cases, committed))) {
      write(path.join(dir, name), value)
    }
  }

  index[family] = cases.map((c) => c.id)
  console.log('generated ' + family)
}

write(path.join(fixtures, 'index.json'), index)

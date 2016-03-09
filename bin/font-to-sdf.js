var minimist = require('minimist')
var argv = minimist(process.argv.slice(2))
var mkdirp = require('mkdirp')
var sdf = require('../sdf')

function usage() {
  console.log('USAGE: font-to-sdf', '[--from-file=PATH] [--from-family=FAMILY] OUTPUT')
}

if (argv['_'].length === 0) {
  fail(new Error('An output file must be specified.'))
}

var toSdfFile = argv['_'][0]
mkdirp(toSdfFile)

var opts = {
  start: 0,
  end: 256
}

var fromFile = argv['from-file']
var fromFamily = argv['from-family']

if (fromFile) {
  sdf.fromFontFile(fromFile, toSdfFile, opts, done)
} else if (fromFamily) {
  sdf.fromFontFamily(fromFamily, toSdfFile, opts, done)
} else {
  // TODO: Check stdin for font buffer input
  fail(new Error('An input font file or a font family must be specified.'))
}

function done(err, res) {
  if (err) {
    fail(err)
  } else {
    ok(res)
  }
}

function ok(msg) {
  console.log(msg)
  process.exit(0)
}

function fail(err) {
  console.error(err)
  usage()
  process.exit(1)
}

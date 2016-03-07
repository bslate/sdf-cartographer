var tape = require('tape')
var fs = require('fs')
var fontManager = require('font-manager')
var fontnik = require('fontnik')
var _ = require('lodash')
var Protobuf = require('pbf')
var Glyphs = require('../glyphs')

var testFontFamily = 'Times New Roman'

tape('system has fonts available', function (t) {
  fontManager.getAvailableFonts(function (fonts) {
    t.ok(fonts.length > 0, 'has a font')
    var timesNewRoman = _(fonts).find(function (font) {
      return font.family == testFontFamily
    })
    t.ok(timesNewRoman, 'has font family ' + testFontFamily)
    t.end()
  })
})

function loadTestFontSync() {
  return fontManager.findFontSync({
    family: testFontFamily
  })
}

tape('can load font', function (t) {
  var font = loadTestFontSync()
  t.ok(font, 'loaded test font')
  var buffer = fs.readFileSync(font.path)
  t.ok(Buffer.isBuffer(buffer), 'font file is a buffer')
  fontnik.load(buffer, function (err, faces) {
    t.error(err)
    t.ok(faces, 'loaded font faces')
    t.ok(faces.length > 0, 'has at least one font face')
    t.end()
  })
})


tape('can save font glyphs', function (t) {
  var font = loadTestFontSync()
  var buffer = fs.readFileSync(font.path)
  fontnik.range({
    font: buffer,
    start: 0,
    end: 256
  }, function (err, res) {
    t.error(err)
    t.ok(res)
    var glyphs = new Glyphs(new Protobuf(new Uint8Array(res)))
    t.ok(glyphs)
    var output = JSON.stringify(glyphs)
    t.ok(output)
    fs.writeFileSync(__dirname + '/output/' + testFontFamily + '.json', output)
    t.end()
  })
})
var _ = require('lodash')
var fs = require('fs')
var path = require('path')
var fontManager = require('font-manager')
var sdf = require('fontnik')
var async = require('async')
var binPack = require('bin-pack')
var pngStream = require('png-stream')
var uuid = require('node-uuid').v4
var mkdirp = require('mkdirp')
var Protobuf = require('pbf')
var Glyphs = require('./glyphs')

var TMP_PATH = './tmp'
var SAVE_PATH = './saved'

var fontFamily = 'Times New Roman'
var font = fontManager.findFontSync({ family: fontFamily })
var fontBuffer = fs.readFileSync(font.path)
var glyphRange = { start: 0, end: 256 }

createSdf(function (err, results) {
  if (err) {
    console.error(err)
  } else {
    console.log('results', results)
  }
})

function createSdf(callback) {
  var start = glyphRange.start
  var end = glyphRange.end
  writeSdf(fontBuffer, start, end, callback)
}

function load(callback) {
  loadBuffer(fontBuffer, callback)
}

function loadBuffer(buffer, callback) {
  sdf.load(buffer, function (err, faces) {
    callback(err, faces)
  })
}

function uniqueName() {
  var sep = '-'
  var baseName = fontFamily.toLowerCase().replace(/\W/, sep)
  return baseName + sep + uuid() + '.sdf'
}

function createTmpPath() {
  var dir = path.join(TMP_PATH, uniqueName())
  mkdirp.sync(dir)
  return dir
}

function createWebGLPath() {
  return path.join('./webgl')
}

function createSdfPath() {
  return createWebGLPath()
}

function writeSdf(buffer, start, end, callback) {
  sdf.range({
    font: buffer,
    start: start,
    end: end
  }, function (err, res) {
    var allGlyphs = new Glyphs(new Protobuf(new Uint8Array(res)))
    var stacks = _.values(allGlyphs.stacks)
    var glyphs = _.first(stacks).glyphs
    var bins = _.values(glyphs)
    insetBorderInPlace(bins)
    var size = binPack(bins, { inPlace: true })
    var sdfPath = createSdfPath()
    var texturePath = path.join(sdfPath, 'texture0.png')
    var metricsPath = path.join(sdfPath, 'metrics.json')
    var filesToWrite = [
      writePng(texturePath, bins, size),
      writeMetrics(metricsPath, glyphs)
    ]
    async.parallel(filesToWrite, callback)
  })
}

function insetBorderInPlace(bins) {
  _.forEach(bins, function (b) {
    var inset = b.border * 2
    b.width += inset
    b.height += inset
  })
}

function writePng(path, bins, size) {
  return function (callback) {
    var w = size.width
    var h = size.height
    var pixels = new Buffer(w * h)
    pixels.fill(0)

    var bitmapBins = _.filter(bins, function (b) { return !!b.bitmap })
    _.forEach(bitmapBins, function (b) {
      var bitmap = b.bitmap
      for (var x = 0; x < b.width; ++x) {
        for (var y = 0; y < b.height; ++y) {
          var src = offset(x, y, b)
          var dst = offset(b.x + x, b.y + y, size)
          pixels[dst] = bitmap[src]
        }
      }
    })

    function offset(x, y, size) {
      return y * size.width + x
    }

    var encoder = new pngStream.Encoder(w, h, { colorSpace: 'gray' })
    var writeStream = fs.createWriteStream(path)
    writeStream.on('finish', done)
    writeStream.on('error', done)
    encoder.pipe(writeStream)
    encoder.end(pixels)
    function done(err) {
      callback(err, path)
    }
  }
}

/**
  {
    "family":"Open Sans",
    "style":"Regular",
    "buffer":3,
    "size":24,
    "chars":{
      " ":[0,0,0,0,6],
      "!":[4,19,1,18,6,2,2],
      ...
    }
  }
 */
function writeMetrics(path, glyphs) {
  return function (callback) {
    var chars = {}
    var list = _.values(glyphs)
    _.forEach(list, function (g) {
      var ch = String.fromCharCode(g.id)
      chars[ch] = [
        g.width - (g.border * 2),
        g.height - (g.border * 2),
        g.left,
        g.top,
        g.advance,
        g.x,
        g.y
      ]
    })
    var metrics = {
      "family": fontFamily,
      "style": "Regular",
      "size": 24,
      "buffer": 3,
      "chars": chars
    }
    var buffer = 'var metrics = ' + JSON.stringify(metrics) + ';'
    fs.writeFileSync(path, buffer)
    callback(null, path)
  }
}

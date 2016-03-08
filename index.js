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

var outputPath = './saved'
var fontFamily = 'Times New Roman'

var font = fontManager.findFontSync({ family: fontFamily })
var fontBuffer = fs.readFileSync(font.path)
var glyphRange = { start: 0, end: 256 }

convert(function (err, results) {
  if (err) {
    console.error(err)
  } else {
    console.log('results', results)
  }
})

function load(callback) {
  loadBuffer(fontBuffer, callback)
}

function convert(callback) {
  var start = glyphRange.start
  var end = glyphRange.end
  convertBuffer(fontBuffer, start, end, callback)
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

function createUniquePath() {
  var dir = path.join(outputPath, uniqueName())
  mkdirp.sync(dir)
  return dir
}

function convertBuffer(buffer, start, end, callback) {
  sdf.range({
    font: buffer,
    start: start,
    end: end
  }, function (err, res) {
    var allGlyphs = new Glyphs(new Protobuf(new Uint8Array(res)))
    var stacks = _.values(allGlyphs.stacks)
    var glyphs = _.first(stacks).glyphs
    var bins = _.values(glyphs)
    var size = binPack(bins, { inPlace: true })
    var sdfPath = createUniquePath()
    var texturePath = path.join(sdfPath, 'texture0.png')
    var metricsPath = path.join(sdfPath, 'metrics.json')
    var filesToWrite = [
      writePng(texturePath, bins, size),
      writeMetrics(metricsPath, glyphs)
    ]
    async.parallel(filesToWrite, callback)
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

function writeMetrics(path, glyphs) {
  return function (callback) {
    var metrics = JSON.stringify({})
    fs.writeFileSync(path, metrics)
    callback(null, path)
  }
}

// Command line

function convertFile(file, callback) {
  fs.readFile(file, function (err, buf) {
    if (err) {
      callback(err)
    } else {
      convertBuffer(buf, callback)
    }
  })
}

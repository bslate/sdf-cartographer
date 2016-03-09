var _ = require('lodash')
var fs = require('fs')
var assert = require('assert')
var path = require('path')
var fontManager = require('font-manager')
var sdfGenerator = require('fontnik')
var async = require('async')
var binPack = require('bin-pack')
var pngStream = require('png-stream')
var uuid = require('node-uuid').v4
var mkdirp = require('mkdirp')
var Protobuf = require('pbf')
var Glyphs = require('./glyphs')

module.exports.write = writeSdf
module.exports.fromFontDescriptor = fromFontDescriptor
module.exports.fromFontFamily = fromFontFamily
module.exports.fromFontFile = fromFontFile

function fromFontDescriptor(fontDescriptor, toFile, opts, callback) {
  fontManager.findFont(fontDescriptor, function (font) {
    fromFontFile(font.path, toFile, opts, callback)
  })
}

function fromFontFamily(family, toFile, opts, callback) {
  fromFontDescriptor({ family: family }, toFile, opts, callback)
}

function fromFontFile(file, toFile, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }
  if (typeof opts.start === 'undefined') {
    opts.start = 0
  }
  if (typeof opts.end === 'undefined') {
    opts.end = 256
  }
  fs.readFile(file, function (err, buffer) {
    if (err) {
      callback(err)
    } else {
      writeSdf(toFile, buffer, opts.start, opts.end)
    }
  })
}

function writeSdf(file, fontBuffer, start, end, callback) {
  assert(Buffer.isBuffer(fontBuffer))
  assert(!isNaN(parseInt(start)))
  assert(!isNaN(parseInt(end)))

  sdfGenerator.range({
    font: fontBuffer,
    start: start,
    end: end
  }, function (err, res) {
    var allGlyphs = new Glyphs(new Protobuf(new Uint8Array(res)))
    var stacks = _.values(allGlyphs.stacks)
    var glyphs = _.first(stacks).glyphs
    var bins = _.values(glyphs)
    insetBorderInPlace(bins)
    var size = binPack(bins, { inPlace: true })
    var texturePath = path.join(file, 'texture0.png')
    var metricsPath = path.join(file, 'metrics.json')
    var filesToWrite = [
      writePng(texturePath, bins, size),
      writeMetrics(metricsPath, glyphs, fontBuffer)
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

function writeMetrics(path, glyphs, fontBuffer) {
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
    sdfGenerator.load(fontBuffer, function (err, fontInfo) {
      if (err) {
        callback(err, path)
      } else {
        var metrics = {
          "family": fontInfo['family_name'],
          "style": fontInfo['style_name'],
          "buffer": 3,
          "chars": chars
        }
        var buffer = JSON.stringify(metrics)
        fs.writeFile(path, buffer, function (err) {
          callback(err, path)
        })
      }
    })
  }
}

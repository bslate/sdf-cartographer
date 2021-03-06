'use strict'

var BORDER = 3 // Note: this value is hard-coded in `node-fontnik`

function Glyphs (buffer, end) {
  this.stacks = {}

  var buffer
  var val, tag
  
  if (typeof end === 'undefined') {
    end = buffer.length
  }

  while (buffer.pos < end) {
    val = buffer.readVarint()
    tag = val >> 3
    if (tag == 1) {
      var fontstack = readFontstack()
      this.stacks[fontstack.name] = fontstack
    } else {
      buffer.skip(val)
    }
  }

  function readFontstack() {
    var fontstack = { glyphs: {} }

    var bytes = buffer.readVarint()
    var val, tag
    var end = buffer.pos + bytes
    while (buffer.pos < end) {
      val = buffer.readVarint()
      tag = val >> 3

      if (tag == 1) {
        fontstack.name = buffer.readString()
      } else if (tag == 2) {
        var range = buffer.readString()
        fontstack.range = range
      } else if (tag == 3) {
        var glyph = readGlyph()
        fontstack.glyphs[glyph.id] = glyph
      } else {
        buffer.skip(val)
      }
    }

    return fontstack
  }

  function readGlyph() {
    var glyph = {}

    var bytes = buffer.readVarint()
    var val, tag
    var end = buffer.pos + bytes
    while (buffer.pos < end) {
      val = buffer.readVarint()
      tag = val >> 3

      if (tag == 1) {
        glyph.id = buffer.readVarint()
      } else if (tag == 2) {
        glyph.bitmap = buffer.readBytes()
      } else if (tag == 3) {
        glyph.width = buffer.readVarint()
      } else if (tag == 4) {
        glyph.height = buffer.readVarint()
      } else if (tag == 5) {
        glyph.left = buffer.readSVarint()
      } else if (tag == 6) {
        glyph.top = buffer.readSVarint()
      } else if (tag == 7) {
        glyph.advance = buffer.readVarint()
      } else {
        buffer.skip(val)
      }
      glyph.border = BORDER
    }

    return glyph
  }
}

module.exports = Glyphs

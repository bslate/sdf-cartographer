var _ = require('lodash')
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var uuid = require('node-uuid').v4
var express = require('express')
var MultipartForm = require('busboy')
var concat = require('concat-stream')
var sdf = require('./sdf')

var PUB_DIR = './public'
var TMP_DIR = path.join(PUB_DIR, 'tmp')

var port = process.env.PORT || 3000
var app = express()
app.use(express.static(path.join(__dirname, 'public')))

app.post('/', function (req, res, next) {
  var form = new MultipartForm({
    headers: req.headers,
    limits: {
      files: 1
    }
  })
  
  form.on('file', function (field, fileStream, name, encoding, mimetype) {
    var file = concat(function (buffer) {
      var tmpFile = createTmpPath(name)
      var opts = {
        start: 0,
        end: 256
      }
      sdf.fromFontBuffer(buffer, tmpFile, opts, function (err, output) {
        file.end()
        if (err) {
          res.status(500).send({
            error: err
          })
        } else {
          res.status(200).send({
            files: _.map(output, function (file) {
              return path.relative(PUB_DIR, file)
            })
          })
        }
        res.end()
      })
    })
    fileStream.pipe(file)
  })

  return req.pipe(form)
})

app.listen(port, function () {
  console.log('started sdf server on port', port)
})

function uniqueName(name) {
  var sep = '-'
  var baseName = name.toLowerCase().replace(/\W/, sep)
  return baseName + sep + uuid() + '.sdf'
}

function createTmpPath(name) {
  var dir = path.join(TMP_DIR, uniqueName(name))
  mkdirp.sync(dir)
  return dir
}

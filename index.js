var fontManager = require('font-manager')

fontManager.getAvailableFonts(function (fonts) {
  console.log(fonts);
})

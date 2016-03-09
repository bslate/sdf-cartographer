var gulp = require('gulp')

gulp.task('scripts', function () {
  gulp.src('./node_modules/d3/d3.min.js')
    .pipe(gulp.dest('./public/scripts'))
})

gulp.task('default', ['scripts'])

'use strict';
var gulp = require('gulp');
var vulcanize = require('gulp-vulcanize');
var replace = require('gulp-replace');
var minifyHTML = require('gulp-minify-html');
var minifyInline = require('gulp-minify-inline');
var rename = require('gulp-rename');

var FILE = 'sweva-visualization-bar-chart.html'
gulp.task('pack', function () {
    return gulp.src(FILE)
        .pipe(replace(/<link.*.html">/g, ''))
        .pipe(replace(/"\.\.\//g, '"../bower_components/'))
       
        .pipe(gulp.dest('dist'))
        .pipe(vulcanize({
            stripComments: true,
            inlineCss: true,
            inlineScripts: true
        }))
       
        .pipe(minifyInline())
        .pipe(minifyHTML({
            quotes: true,
            empty: true,
            spare: true
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('dist'))
});

gulp.task('packdev', function () {
    return gulp.src(FILE)
        .pipe(replace(/<link.*.html">/g, ''))
        .pipe(replace(/"\.\.\//g, '"../bower_components/'))

        .pipe(gulp.dest('dist'))
        .pipe(vulcanize({
            stripComments: true,
            inlineCss: true,
            inlineScripts: true
        }))        
        .pipe(gulp.dest('dist'))
});

gulp.task('build', ['pack', 'packdev']);

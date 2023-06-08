/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

// Include Gulp & tools we'll use
const gulp = require('gulp');
const gulp_util = require('gulp-util');
const replace = require('gulp-replace');
const uglify = require('gulp-uglify-es').default;
const $ = require('gulp-load-plugins')();
const rename = require('gulp-rename');
const filter = require('gulp-filter');
const browserSync = require('browser-sync').create();
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const browserify = require('browserify');
const sourcemaps = require('gulp-sourcemaps');
const historyApiFallback = require('connect-history-api-fallback');
const ext_replace = require('gulp-ext-replace');
const through = require('through2');
const PluginError = require('plugin-error');
const shell = require('gulp-shell');
const del = require('del');

//const fs = require('fs');
//const merge = require('merge-stream');
//const path = require('path');
//const runSequence = require('run-sequence');
//const log = require('fancy-log');

function prefixStream(prefixText) {
    var stream = through();
    stream.write(prefixText);
    return stream;
}

var composableToJSON = function () {
    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            // return empty file
            return cb(null, file);
        }
        if (file.isBuffer()) {
            var fileContents = String(file.contents) + '';
            //we now have the relevent object
            var resultObj = new Function('return' + fileContents)();

            for (var key in resultObj) {
                if (resultObj.hasOwnProperty(key)) {
                    if (typeof resultObj[key] === 'function') {
                        resultObj[key] = resultObj[key].toString().match(/[^\r\n]+/g);
                    }
                }
            }

            //pretty print
            var result = JSON.stringify(resultObj, null, 4);
            file.contents = new Buffer(result.toString());
        }
        if (file.isStream()) {
            throw new PluginError('composableToJSON', 'Only Buffer format is supported');
        }

        cb(null, file);
    });
}

// Lint JavaScript
gulp.task('jshint', function () {
    return gulp.src([
        'app/**/*.js',
        'app/**/*.html',
        'gulpfile.js'
    ])
      .pipe(reload({ stream: true, once: true }))
      .pipe($.jshint.extract()) // Extract JS from .html files
      .pipe($.jshint())
      .pipe($.jshint.reporter('jshint-stylish'))
      .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});


// gulp.task('docs', shell.task([
//     './node_modules/.bin/jsdoc app/core/ -r -R README.md -d docs -t ./node_modules/ink-docstrap/template -c jsdocConfig.json'
// ]));

// Clean output directory
gulp.task('clean', function (cb) {
    del(['dist'], cb);
});

gulp.task('browserify', function () {
    return browserify('./app/core/core.js', {
                debug: true
            }
        )
        .ignore('web-worker') //this is a nodejs module and only loaded for nodejs
        .ignore('requirejs')
        .bundle()
        .on('error', function(err){
            gulp_util.log(gulp_util.colors.red('Error'), err.message);
            if(err.codeFrame)
                console.log(err.codeFrame);
            this.emit('end');
        })
        .pipe(source('core.build.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./dist/'));
});
gulp.task('minify', function () {
    return gulp.src('./dist/core.build.js')
        .pipe(buffer())
        .pipe(replace("catch{", "catch(ignore){"))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('./dist/'));
});
gulp.task('composablesToJSON', function () {
    return gulp.src(['app/examples/*.js'])
    .pipe(ext_replace('.json'))
    .pipe(composableToJSON())
    .pipe(gulp.dest('app/examplesJSON'));
});

// Copy all files at the root level (app)
// gulp.task('copy', function () {
//     var app = gulp.src([
//       'app/*',
//       '!app/test',
//       '!app/cache-config.json'
//     ], {
//         dot: true
//     }).pipe(gulp.dest('dist'));
//
//     var bower = gulp.src([
//       'bower_components/**/*'
//     ]).pipe(gulp.dest('dist/bower_components'));
//
//     return merge(app, bower)
//       .pipe($.size({ title: 'copy' }));
// });
//


// Watch files for changes & reload
gulp.task('serve', gulp.series('browserify', 'minify', function () {
    function reloadWrapper(done) {
        browserSync.reload();
        done();
    }

    browserSync.init({
        port: 5001,
        notify: false,
        open: false, //don't automatically open browser tab
        reloadOnRestart: true,
        logPrefix: 'SWeVA',
        ui: false,
        snippetOptions: {
            rule: {
                match: '<span id="browser-sync-binding"></span>',
                fn: function (snippet) {
                    return snippet;
                }
            }
        },
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: {
            baseDir: ['dist', 'app'],
            middleware: [historyApiFallback(),
                function (req, res, next) {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    next();
                }],
            routes: {
                '/bower_components': 'bower_components',
                '/node_modules': 'node_modules',
                '/node_modules/sweva-core/app/core/compilers': 'app/core/compilers'    //allows using WebWorker with same path in core framework index.html as in UI
            }
        }
    });

    gulp.watch(['app/**/*.html',
    'app/examplePipelines.js',
    'app/examplesJSON/**/*.json',], reloadWrapper);

    gulp.watch(['app/examples/*.js'], gulp.series('composablesToJSON'));
    //reload before minifying, because gulp-uglify is slow and not needed for dev
    gulp.watch(['app/core/**/*.js'], gulp.series('browserify', reloadWrapper, 'minify'));
}));

// Build and serve the output from the dist build
/*gulp.task('serve:dist', ['default'], function () {
    browserSync({
        port: 5001,
        notify: false,
        logPrefix: 'SWeVA',
        snippetOptions: {
            rule: {
                match: '<span id="browser-sync-binding"></span>',
                fn: function (snippet) {
                    return snippet;
                }
            }
        },
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: 'dist',
        middleware: [historyApiFallback()]
    });
});*/

// Build production files, the default task
gulp.task('default', gulp.series('clean', 'browserify', 'minify', async function() {
    gulp_util.log('Info', 'core.build.min.js is available in /dist\nRun task \'serve\' to start a webserver for development.');
}));
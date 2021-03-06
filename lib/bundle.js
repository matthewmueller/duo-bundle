/**
 * Module Dependencies
 */

var debug = require('debug')('duo:bundle');
var relative = require('path').relative;
var resolve = require('path').resolve;
var extname = require('path').extname;
var uglify = require('gulp-uglify');
var Batch = require('batch');
var yieldly = require('yieldly');
var Glob = require('glob').sync;
var map = require('map-stream');
var join = require('path').join;
var csso = require('gulp-csso');
var jade = require('duo-jade');
var gulp = require('gulp');
var Duo = require('duo');
var co = require('co');

/**
 * Expose `build`
 */

module.exports = yieldly(build);

/**
 * Gulp plugins
 */

var myth = require('gulp-myth');

/**
 * Environment
 */

var production = 'production' == process.env.NODE_ENV;

/**
 * File extension maps
 */

var extmap = {
  'styl': 'css'
};

/**
 * Build
 *
 * @param {String|Array} glob
 * @param {Function} fn
 * @api public
 */

function build(root, glob, fn) {
  var files = 'string' == typeof glob ? Glob(glob, { cwd: root }) : glob;
  debug('building "%s"', files.join('", "'));
  var segments = segment(files);

  var batch = new Batch();
  batch.concurrency(1);
  if (segments.css) segments.css.map(wrap(styles)).map(batch.push, batch);
  if (segments.js) segments.js.map(wrap(scripts)).map(batch.push, batch);

  batch.end(function(err) {
    if (err) return fn(err);
    debug('built "%s"', files.join('", "'));
    return fn();
  });

  // wrap batch
  function wrap(gulpfn) {
    return function (file) {
      return function (done) {
        gulpfn(root, file, done);
      }
    }
  }
}

/**
 * Compile styles
 *
 * @param {String} root
 * @param {String} style
 * @param {Function} fn
 * @return {Gulp} stream
 * @api private
 */

function styles(root, style, fn) {
  var s = gulp.src(style, { cwd: root })
    .pipe(logger(root, 'building'))
    .pipe(duo(root))
    .on('error', fn)
    .pipe(myth())
    .on('error', fn)

  if (production) {
    s.pipe(csso())
     .on('error', fn);
  }

  s.pipe(logger(root, 'built'))
   .pipe(gulp.dest('build', { cwd: root }))
   .on('error', fn)
   .on('end', fn);

  return s;
}

/**
 * Compile javascript
 *
 * @param {String} root
 * @param {String} script
 * @return {Function} fn
 */

function scripts(root, script, fn) {
  var s = gulp.src(script, { cwd: root })
    .pipe(logger(root, 'building'))
    .pipe(duo(root))
    .on('error', fn);

  if (production) {
    s.pipe(uglify())
     .on('error', fn);
  }

  s.pipe(logger(root, 'built'))
   .pipe(gulp.dest('build', { cwd: root }))
   .on('error', fn)
   .on('end', fn);

  return s;
}

/**
 * Build with Duo
 *
 * @param {String} root
 * @return {Function}
 */

function duo(root) {
  return map(function(file, fn) {
    // change the base to root
    file.base = root;

    var duo = Duo(root)
      .use(jade())
      .entry(file.path);

    if (production) duo.copy(true);

    duo.run(function(err, src) {
      if (err) return fn(err);
      file.contents = new Buffer(src);
      fn(null, file);
    });
  });
}

/**
 * Segment files by extension
 *
 * @param {Array} files
 * @return {Object}
 * @api private
 */

function segment(files) {
  var out = {};

  files.map(function(file) {
    var ext = extname(file).slice(1);
    ext = extmap[ext] ? extmap[ext] : ext;
    if(!out[ext]) out[ext] = [];
    out[ext].push(file);
  });

  return out;
}

/**
 * Logging
 *
 * @param {String} root
 * @param {String} event
 * @param {Stream} stream
 * @api private
 */

function logger(root, event) {
  return map(function(file, fn) {
    debug('%s: %s', relative(root, file.path), event);
    fn(null, file);
  });
}

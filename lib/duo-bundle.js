/**
 * Module Dependencies
 */

var bundle = require('./bundle.js');

/**
 * Export `middleware`
 */

module.exports = middleware;

/**
 * Environment
 */

var production = 'production' == process.env.NODE_ENV;

/**
 * Initialize `middleware`
 *
 * @param {String} glob
 * @return {Generator}
 */

function middleware(root) {
  return function(glob) {
    return function *(next) {
      if (!production) yield bundle(root, glob);
      yield next;
    }
  }
}

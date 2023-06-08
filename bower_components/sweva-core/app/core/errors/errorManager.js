'use strict';
/**
 * Aggregates {@link SwevaError} messages.
 * @constructor
 */
function ErrorManager() {
    /**
    * An array storing the error messages.
    * @name ErrorManager#queue
    * @type {Array.<Error>}
    */
    this.queue = [];
}
/**
 * Resets the ErrorManager.
 */
ErrorManager.prototype.clear = function () {
    this.queue = [];
}
/**
 * Appends errors to the internal queue, logs them and returns the error object
 * @param {Error} error - The error object.
 * @returns {Error} - The error object.
 */
ErrorManager.prototype.error = function (error) {
    this.queue.push(error);
    console.log(error.toString());
    console.log(error);
    return error;
}
/**
 * Gets a string representation of all stored errors.
 * @returns {string} - All stored errors separated by a linebreak.
 */
ErrorManager.prototype.getLog = function () {
    var result = '';
    for (var i = 0; i < this.queue.length; i++) {
        result += this.queue[i].toString() + '\n';
    }
    return result;
}
/**
 * @returns {Error} - The last error that was recorded.
 */
ErrorManager.prototype.getLastError = function () {
    if (this.queue.length > 0) {
        return this.queue[this.queue.length - 1];
    }
    return null;
}

module.exports = ErrorManager;
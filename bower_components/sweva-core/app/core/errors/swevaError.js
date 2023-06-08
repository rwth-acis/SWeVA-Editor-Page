'use strict';

/**
 * An error object with some additional information.
 * @constructor
 * @extends Error
 * @param {string} message - The error message: What went wrong?
 * @param {string} context - The execution context, in what composable did the error occur?
 * @param {Object} [faultyObject] - Additional information about the error cause.
 */
function SwevaError(message, context, faultyObject) {
    /**
    * The name of the error object.
    * @name SwevaError#name
    * @type {string}
    */
    this.name = 'SwevaError';

    /**
    * The error message.
    * @name SwevaError#message
    * @type {string}
    */
    this.message = message || 'Default Message';

    /**
    * The callstack of the error.
    * @name SwevaError#stack
    * @type {Object}
    */
    this.stack = (new Error()).stack;

    /**
    * The execution context of the error (in which composable it occured).
    * @name SwevaError#context
    * @type {string}
    */
    this.context = context;

   
    if (faultyObject !== 'undefined') {
        //shallow copy: should provide enough information and save RAM
        //copy is needed, as we need the object exactly at the time the error occurred
        this.faultyObject = faultyObject;

        if (typeof faultyObject === 'function') {
            //make functions to strings            
            this.faultyObject = faultyObject.toString();
        }
        else if (typeof faultyObject === 'object') {
            for (var key in faultyObject) {
                if (faultyObject.hasOwnProperty(key)) {
                    this.faultyObject[key] = faultyObject[key];
                }
            }
        }
    }
    else {
        this.faultyObject = null;
    }
    /**
    * The timestamp of the error.
    * @name SwevaError#time
    * @type {number}
    */
    this.time = Date.now();

    console.error("Error in "+context+" created! Stacktrace:");
    console.trace();
}
//inherit properties
SwevaError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: this.constructor,
        writable: true,
        configurable: true
    }
});
/**
 * @returns {string} - A string representation of the error timestamp.
 */
SwevaError.prototype.getTime = function () {
    return new Date(this.time).toLocaleTimeString();
}

/**
 * Converts error object to string including relevant information (timestamp, name, context, message, additional information).
 * @returns {string} - String representation of the error.
 */
SwevaError.prototype.toString = function () {
    var faultyObject = '';
    if (typeof this.faultyObject === 'object') {
        //transform object to pretty printed string (with identation).
        faultyObject = JSON.stringify(this.faultyObject, null, 4);
    }
    else {
        faultyObject = this.faultyObject.toString();
    }
    //construct string
    return '[' + this.getTime() + '] SwevaError ' + this.name + ' in ' + this.context + ': ' + this.message + '\n'
        + faultyObject;
}
module.exports = SwevaError;
'use strict';
var JsTokens = require('../../../node_modules/js-tokens/index.js');
/**
 * Responsible to verify if a string complies to a safe  JavaScript subset.
 * A blacklist used to ensure no harmful operation can be performed by user defined scripts.
 * Currently the following tokens are forbidden:
 * arguments, callee, caller, constructor, eval, prototype, stack, unwatch, valueOf, watch, __proto__, __parent__, 'this', window, document, '[', ']', Function, 'with', uneval, toSource, setTimeout, setInterval
 * Use {@link SwevaScript#get} as a replacement for [].
 * 
 * Additionally global variables are masked.
 * @constructor 
 */
function SwevaScript() {
    /**
    * List of forbidden tokens, that are not allowed in this JavaScript subset.
    * @name SwevaScript#forbiddenList
    * @type {Object.<string, boolean>}
    */
    this.forbiddenList = {
        arguments: true,
        callee: true,
        caller: true,
        constructor: true,
        eval: true,
        prototype: true,
        stack: true,
        unwatch: true,
        valueOf: true,
        watch: true,

        __proto__: true,
        __parent__: true,
        'this': true,
        window: true,
        document: true,
        '[': true,
        ']': true,
        Function: true,
        'with': true,
        uneval: true,
        toSource: true,
        setTimeout: true,
        setInterval: true
    }
    /**
    * List of allowed global variables, that should not be masked.
    * This is currently: Math, console 
    * @name SwevaScript#allowedGlobals
    * @type {Object.<string, boolean>}
    */
    this.allowedGlobals = {
        Math: true,
        console: true,
        'true': true,
        'false': true
    }
}

/**
 * Verifies if a JavaScript code complies to the safer JavaScript subset.
 * Does not rewrite or change the code, therefor you should DENY anything, that is considered harmful by this function.
 * 
 * @param {string} code - The JavaScript code to verify for safety.
 * @returns {boolean} True, if the code does not contain forbidden tokens.
 */
SwevaScript.prototype.verify = function (code) {
    try {
        //get an array of tokens using the tokenizer (external library)
        var tokens = code.match(JsTokens);
    } catch (e) {
        return {
            valid: false,
            error: e.message
        }
    }
   
    //check for each token
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i].trim();
        if (token.length > 0) {
            //if token non empty: is it in the blacklist?
            if (this.forbiddenList.hasOwnProperty(token)) {
                return {
                    valid: false,
                    error: 'Invalid usage of ' + token
                };
            }
        }

        
    }

    //if no return reached before, we can assume there was no forbidden token present
    return {
        valid: true,
        error: ''
    }
};

/**
 * Replaces the forbidden [] accessor, by checking the property name during runtime.
 * If a forbidden property (see {@link SwevaScript}) is used, the property is not accessed.
 * 
 * @param {Object} object - The object from which the property value is required.
 * @param {string|number} property - The name of the property to retrieve the value from.
 * returns {Object|boolean|string|number} - The value of the property, if an illegal property name is used null.
 */
SwevaScript.prototype.get = function (object, property) {
    var forbiddenList = {
        arguments: true,
        callee: true,
        caller: true,
        constructor: true,
        eval: true,
        prototype: true,
        stack: true,
        unwatch: true,
        valueOf: true,
        watch: true,

        __proto__: true,
        __parent__: true,
        'this': true,
        window: true,
        document: true,
        '[': true,
        ']': true,
        Function: true,
        'with': true,
        uneval: true,
        toSource: true,
        setTimeout: true,
        setInterval: true
    }
    //if a string is provided, check for being in the blacklist
    if (typeof property === 'string') {
        if (!object.window && !forbiddenList.hasOwnProperty(property)) {
            return object[property];
        }
    }
    //numbers are not checked for being in the blacklist
    else if (typeof property === 'number') {
        return object[property];
    }

    console.error('Illegal property name: ' + property);
    return null;
}

SwevaScript.prototype.set = function (object, property, value) {
    var forbiddenList = {
        arguments: true,
        callee: true,
        caller: true,
        constructor: true,
        eval: true,
        prototype: true,
        stack: true,
        unwatch: true,
        valueOf: true,
        watch: true,

        __proto__: true,
        __parent__: true,
        'this': true,
        window: true,
        document: true,
        '[': true,
        ']': true,
        Function: true,
        'with': true,
        uneval: true,
        toSource: true,
        setTimeout: true,
        setInterval: true
    }
    //if a string is provided, check for being in the blacklist
    if (typeof property === 'string') {
        if (!object.window && !forbiddenList.hasOwnProperty(property)) {
            object[property] = value;
        }
        else {
            console.error('Illegal property name: ' + property);
        }
    }
    //numbers are not checked for being in the blacklist
    else if (typeof property === 'number') {
        object[property] = value;
    }
};

/**
 * Sanitizes given Javascript code by verifying if it is a safer subset of JavaScript and masking global variables.
 * {@link SwevaScript#verify} is performed internally, so you do not need to verify explicitly beforehand.
 * @param {string} code - The JavaScript function to sanitize.
 * @param {function} errorCallback - A callback called, when an error occurs, has a string as a parameter with the error message.
 * @returns{function} - A function, that can be executed
 */
SwevaScript.prototype.sanitize = function (code, errorCallback) {
    //all in one line
    //code = code.replace(/(\r\n|\n|\r)/gm, ""); 
   
    var error = '';
    //first make sure it is valid SwevaScript
    var validation = this.verify(code);    
    if (validation.valid) {        
        var allowedGlobals = this.allowedGlobals;
        //get all global variables except the exceptions we defined in {@link SwevaScript#allowedGlobals}
        var globals = Object.keys(window).filter(function (obj) {
            return !allowedGlobals.hasOwnProperty(obj)
        }).join(',');
        //we want to shadow all global variables except the ones we allow, by declaring them as local variables
        //https://stackoverflow.com/posts/26917938/revisions
        //var funcReg = /function *\(([^()]*)\)[ \n\t]*{(.*)}/gmi;
        var funcReg = /function\s*\(([^()]*)\)\s\{((.|\n)*)\}/gmi;
        var match = funcReg.exec(code);
       
        //we extract funtion header (decrlaration with parameters) and body
        if (match) {
            
            //enforce strict behavior, shadow globals, append verified code
            var fn_text = '"use strict"; var ' + globals + ';' + match[2] + ';';
            
            var fn = new Function(match[1].split(','), fn_text);//generate sanitized function

            return fn;
        }
        else {
            error = 'Not a valid JS function';
        }
    }
    else {
        error = validation.error;
    }
    if (typeof errorCallback === 'function') {
        errorCallback(error);
    }
    
    return null;
}

module.exports = SwevaScript;
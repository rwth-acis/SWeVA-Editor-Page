'use strict';

/**
 * The compiler loads the necessary resources for compilation of a language, compiles code and returns the resulting binary.
 * It has two phases: A setup phase, were all dependencies are loaded and initialized and an operational phase, which is used to compile code
 * 
 * The setup needs to be done only once, while the execution can be repeated on different data.
 * Additionally the setup should only be called, when the compiler is needed, because some dependencies for compiling can be very large
 * 
 * This is a default implementation, returning the input source as the compiled code. It can be used for interpreted languages.
 *
 * @param {SupportLibrary} supportLibrary - source code to compile
 * @constructor
 */
function Compiler(supportLibrary) {
    /**
     * Determines, if dependencies are loaded.
     * @name Compiler#setupCompleted
     * @type {boolean}
     */
    this.setupCompleted = false;

    /**
     * Documentation for functions in support library - should include specifics on language syntax
     * Available after Compiler#setup() has been called.
     * @name Compiler#setupCompleted
     * @type {string}
     */
    this.supportLibraryDocumentation = "";
}

/**
 * Compile the provided source code
 * @param {module} source - source code to compile
 * @return {object} containing binaryData and optionally other properties of specific compilers
 */
Compiler.prototype.compile = function (source) {
    return source;
}
   
/**
 * Loads dependencies
 */
Compiler.prototype.setup = async function () {
    if(!this.setupCompleted) {
        this.setupCompleted = true;
    }
}


module.exports = Compiler
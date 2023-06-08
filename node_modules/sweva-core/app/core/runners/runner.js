'use strict';


/**
 * The runner executes the compiled code made available by the compiler and contains a reference to the matching compiler
 * It has two phases: A setup phase, were all dependencies are loaded and initialized and an operational phase, which is used to compile code
 * The setup needs to be done only once, while the execution can be repeated on different data.
 * 
 * This is a default implementation, which should be subclassed for each supported language
 * 
 * @constructor
 * @abstract
 */
function Runner() {
    /**
    * Determines, if dependencies are loaded.
    * @name ExecutionManager#modulesTotal
    * @type {boolean}
    */
    this.setupCompleted = false;
}

/**
 * Run the provided binary or source code
 * @param {module} module - module containing source code/binary to run
 * @param {Object} data - data passed to the processing node
 * @param {Object} input - inputs passed to the processing node
 *
 * @abstract
 */
Runner.prototype.exec = function (module, data, input) {
}

/**
 * Prepare the provided module for execution:
 * - compile, if not already compiled
 * - update references to binary/hash
 * - update data schemes
 * This is also used to validate new source code while editing
 *
 * @param {module} module - module containing source code/binary to run
 * @return {Object} instance ready to execute
 * @throws CompileError
 *
 * @abstract
 */
Runner.prototype.prepare = function (module) {}

/**
 * End user friendly Name
 */
Runner.prototype.name = "Abstract Runner"

/**
 * ID used internally, to identify runners
 */
Runner.prototype.id = "abstract_runner"

/**
 * @return Description of the runner including a link to the official documentation and support library explanation as html.
 * @abstract
 */
Runner.prototype.getHTMLDescription = function () {}


/**
 * Calculates Hash used to compare binaries
 *
 * @param {Uint8Array} binary - binary to hash
 * @return hash
 *
 */
Runner.prototype.calculateBinaryHash = function (binary) {
    let hash = 0;
    for(let i in binary) {
        hash = ((hash << 8)-hash)+binary[i];
    }
    return hash;
}

/**
 * Determine data schema based on source/binary and write results to the module
 * The properties dataInSchema, dataOutSchema, inputSchema, dataInNames, dataOutNames, inputNames of the module can be written
 * Called automatically, when new source is compiled, but can be used to manually regenerate data schema
 *
 * @param {module} module - module containing source code/binary
 *
 * @abstract
 */
Runner.prototype.createDataSchema = function (module) {
}

module.exports = Runner
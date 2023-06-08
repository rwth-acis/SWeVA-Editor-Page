'use strict';

var DefinitionError = require('../../core/errors/definitionError.js');
/**
 * A compile error should be used, if  the error was thrown by the compiler, before actual execution and validation.
 * @constructor
 * @extends DefinitionError
 */
function CompileError(message, context, faultyObject) {
    DefinitionError.call(this, message, context, faultyObject);
    this.name = 'CompileError';
}
CompileError.prototype = Object.create(DefinitionError.prototype);

module.exports = CompileError;
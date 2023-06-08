'use strict';

var SwevaError = require('../../core/errors/swevaError.js');
/**
 * A definition error should be used, if  the error occured because of incompatible definitions of composables, i.e. before actual execution.
 * @constructor
 * @extends SwevaError
 */
function DefinitionError(message, context, faultyObject) {
    SwevaError.call(this, message, context, faultyObject);
    this.name = 'DefinitionError';
}
DefinitionError.prototype = Object.create(SwevaError.prototype);

module.exports = DefinitionError;
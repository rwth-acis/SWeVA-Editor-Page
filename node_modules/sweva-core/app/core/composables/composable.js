'use strict';

var DefinitionError = require('../../core/errors/definitionError.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');
var Clone = require('../../../node_modules/clone/clone.js');

/**
 * Composables process data. They can be linked into networks.
 * @abstract
 * @constructor
 */
function Composable() {
}
/**
 * A definition of a JSON object.
 * @see {@link http://json-schema.org/documentation.html}
 * @typedef {Object} JSONSchema
 */

/**
 * The initalization object with optional properties to initialize composables.
 * @typedef {Object} composableInitalizer
 * @property {string} [name=someComposable] - The name of the composable.
 * @property {string} [type=module] - The type of the composable: 'module' or 'composition'.
 * @property {JSONSchema} [dataInSchema=null] - The schema of the expected data object received from other composables.
 * @property {JSONSchema} [dataOutSchema=null] - The schema of the data object passed on to later composables.
 * @property {JSONSchema} [inputSchema=null] - The schema of the input object received at the beginning of exection.
 * @property {Array.<string>} [dataInNames=['data']] - The names of the expected properties of the received data object.
 * If there is only one element, the array is ignored and the whole data object is taken (no property names needed).
 * Multiple properties are needed, if you want to receive data from multiple other composables.
 *
 * @property {Array.<string>} [dataOutNames=['result']] - The names of the expected properties of the produced data object.
 * If there is only one element, the array is ignored and the whole data object is taken (no property names needed).
 * Multiple properties are needed, if you want to send data to multiple other composables.
 *
 * @property {Array.<string>} [inputNames=[]] - The names of the expected properties of the input object.
 * If there is only one element, the array is ignored and the whole input object is taken (no property names needed).
 */

/** Initializes the object with a property object.
  * Not defined Properties will get a default value.
 *  @protected
 *  @param {composableInitalizer} initializationObject - The object with optional properties for the composable.
 */
Composable.prototype.initialize = function (initializationObject) {
    this.initializeProperty(initializationObject, 'name', 'someComposable');
    this.initializeProperty(initializationObject, 'type', 'module');
    this.initializeProperty(initializationObject, 'dataInSchema', null);
    this.initializeProperty(initializationObject, 'dataOutSchema', null);
    this.initializeProperty(initializationObject, 'inputSchema', null);

    this.initializeProperty(initializationObject, 'dataInNames', []);
    this.initializeProperty(initializationObject, 'dataOutNames', []);
    this.initializeProperty(initializationObject, 'inputNames', []);

    /**
     * Amount of expected properties for the received data object.
     * @name Composable#dataIn
     * @type {number}
     */
    this.dataIn = this.dataInNames.length;

    /**
    * Amount of expected properties for the produced data object.
    * @name Composable#dataOut
    * @type {number}
    */
    this.dataOut = this.dataOutNames.length;

    /**
    * Amount of expected properties for the received input object
    * @name Composable#inputIn
    * @type {number}
    */
    this.inputIn = this.inputNames.length;

    /**
    * The context of the composable used for error messages.
    * @name Composable#context
    * @type {number}
    */
    this.context = this.constructor.name + '[' + this.name + ']';
}

/**
 * Helper function to initialize internal variables. Sets also default values.
 * @protected
 * @param {composableInitalizer} initializationObject - The object with optional properties for the composable.
 * @param {string} property - The property value to set. The name must be the same both for 'this' and initializationObject.
 * @param {string} defaultValue - A default value is set, if initializationObject does not contain such a property key.
 */
Composable.prototype.initializeProperty = function (initializationObject,
    property, defaultValue) {
    if (initializationObject.hasOwnProperty(property)) {
        var obj = initializationObject[property];
        if (typeof obj === 'object') {
            if (Array.isArray(obj)) {
                if (obj.length == 0) {
                    this[property] = defaultValue;
                    return;
                }
            }
            else if (Object.keys(obj).length == 0){
                this[property] = defaultValue;
                return;
            }
        }
        this[property] = initializationObject[property];
    } else {
        this[property] = defaultValue;
    }
}

/**
 * Helper function to initialize internal functions. Sets also default values.
 * @protected
 * @param {composableInitalizer} initializationObject - The object with optional properties for the composable.
 * @param {string} property - The property value to set. The name must be the same both for 'this' and initializationObject.
 * @param {number} expectedArgumentsCount - The amount of arguments the expected function needs to have. On mismatch an error is thrown.
 * @param {function} defaultValue - A default value is set, if initializationObject does not contain such a property key.
 */
Composable.prototype.initializeFunction = function (initializationObject,
    property, expectedArgumentsCount, defaultValue) {
    if (initializationObject.hasOwnProperty(property)) {
        //check if it is really a function
        if (typeof initializationObject[property] === 'function') {
            //the expected functions (which can be defined by the composable creators) have a fixed signature (arguments),
            //so check here for validation.
            if (initializationObject[property].length >= expectedArgumentsCount) {
                this[property] = initializationObject[property];
            }
            else {
                sweva.ErrorManager.error(
                    new DefinitionError('function "' + property + '" requires at least ' +
                    expectedArgumentsCount + ' arguments, but provides only ' +
                    initializationObject[property].length,
                    this.context, initializationObject[property]));
            }
        }
        else if (initializationObject[property] == null) {
            // for now ignore, as some functions are optional
        }
        else {
            sweva.ErrorManager.error(
                   new DefinitionError('"' + property + '" is reserved for functions, but not defined as one',
                   this.context, initializationObject[property]));
        }
    }
    else {
        this[property] = defaultValue;
    }
}
/**
 * Clones the current composable and overwrites/adds all the properties specified in an extender object.
 * This allows some sort of composable inheritance.
 * @this Composable
 * @param {Composable} extender - The partial composable from which to take the new values.
 * @returns {Composable} The cloned and extended composable object.
 */
Composable.prototype.extendWith = function (extender) {
    var cloned = Clone(this);
    for (var key in extender) {
        //we don't want to clone 'extends' as it is an indicator, that a composable wants to extend another. I.e. What we are doing here :)
        if (extender.hasOwnProperty(key) && key != 'extends') {
            cloned[key] = extender[key];
        }
    }
    return cloned;
}
/**
 * Updates the context during the execution. It uses the parent's context and the alias, the parent has given this composable.
 * looks like: Composition[composition1].Module[module1]
 * @protected
 * @param {string} context - The context of the parent.
 * @param {string} alias - The alias (name) used in the parent for this composable.
 * @returns {string} Updated context.
 */
Composable.prototype.getNewContext = function (context, alias) {
    if (typeof context === 'string') {
        //alias is optional, so check if it is defined
        if (typeof alias !== 'string') {
            alias = '';
        }
        else {
            alias = ': ' + alias;
        }
        return context + '.' + this.constructor.name + '[' + this.name + alias + ']';
    }
    return this.context;
}
/**
 * Validates, if a given object has the expected structure (typecheck) compatible to this composable.
 * If available, it uses the provided JSON schema, otherwise (noch schmema available) it only checks, if the object has all required property keys. Defined by the *Names arrays (see {@link composableInitalizer}).
 * 
 * @param {string} type - Type of object, needed to select the correct type definition. Use 'dataIn', 'dataOut' , 'input' respectively.
 * @param {Object} obj - Object, that should be validated.
 * @returns {boolean} - True, if the object is compatible to this composable regarding the given type.
 */
Composable.prototype.validateTypes = function (type, obj) {
    var typeNames = this[type + 'Names'];
    var typeSchema = this[type + 'Schema'];
    
    //if properties are all present and a schema is provided, we can perform a more detailed check
    if (typeSchema !== null) {
        //use the validator library on the object
        try {
            var valid = sweva.Ajv.validate(typeSchema, obj);
            if (!valid) {
                sweva.ErrorManager.error(new ExecutionError('Object does not match the given ' + type + 'Schema: ' + sweva.Ajv.errorsText(sweva.Ajv.errors),
                    this.context, obj));
                return false;
            }
        } catch(err) {
            /*
            ignore, because an invalid schema like generated by AssemblyScript is generated from the source and
            already matches the input/output data. Consider adding the custom types to the validator, if this is not the
            case for future added languages.
             */
        }
    }

    return true;
}
/**
 * Function to start the data processing. Here only a dummy is defined.
 * @param {Object} data - Tha data object received.
 * @param {Object} input - The input object received.
 * @return {Promise<number>} - The processed data.
 */
Composable.prototype.execute = function (data, input) {
    return new Promise(function (resolve, reject) {
        resolve(0);
    });
}
module.exports = Composable;
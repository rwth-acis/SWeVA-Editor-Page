'use strict';

var Composable = require('../../core/composables/composable.js');
var Module = require('../../core/composables/module.js');
var DefinitionError = require('../../core/errors/definitionError.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');

/**
 * Represents how a composable is linked to another
 * @typedef {Object} linkType
 * @property {string} to - The alias/name of the target composable (i.e. under which key it is defined in the composables dictionary of the composition)
 * @property {string|Object.<string,string>} mapping - How dataOut and dataIn of two composables are mapped to each other.
 * If no mapping is specified, the whole dataOut object is taken as the dataIn object.
 * If a string is specified as a value, it is mapped to the appropriate dataIn property.
 * If a dictionary is specified, the key represents the dataOut property and thevalue the dataIn property it is mapped to.
 * All string values must be using the given values of the dataInNames and dataOutNames arrays defined in the composable.
 */

/**
 * A user defineable function to map the input object of the composition to the input object of individual composables.
 * Basically the function is called for each composable and the return value is then used as its input object.
 * For example you can use an input object, where you specify in detail for every composable the value, then you could simply
 * return input[composableName];
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Composition~mapInputFunction
 * @param {Object} input - The input object given to the composition.
 * @param {string} composableName - The name of the composable requesting an input object.
 * @param {Object.<string,string>} composables - A dictionary of the composables used by the composition.
 * @param {Object} libs - A library object provides access to libs from within the function.
 * @returns {Object} A value to use for the requesting composable as the input object.
 */

/**
 * A user defineable function to map the data object of the composition to the data object of individual composables.
 * Basically the function is called for each composable and the return value is then used as its data object.
 * For example you can use a data object, where you specify in detail for every composable the value, then you could simply
 * return data[composableName];
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Composition~mapDataInFunction
 * @param {Object} data - The data object given to the composition.
 * @param {string} composableName - The name of the composable requesting a data object.
 * @param {Object.<string,string>} composables - A dictionary of the composables used by the composition.
 * @param {Object} libs - A library object provides access to libs from within the function.
 * @returns {Object} A value to use for the requesting composable as the data object.
 */

/**
 * A user defineable function to transform the resulting data object of the data processing pipeline.
 * You could for example add additional properties or remove some, convert values etc.
 * 
 * Attention! The user definable functions use a limited subset ob JavaScript. You cannot use dangereous operations, like accessing this, eval, etc.
 * Moreover, the [] accessor is forbidden, as it cannot be filtered before execution!
 * A replacement function is accessible from inside the function under libs.get, which takes the object and desired property key as a string and
 * acts as [].
 * See {@link SwevaScript} for more details.
 * 
 * @callback Composition~mapDataOutFunction
 * @param {Object} output - The data object produced by the composables without outgoing links (end of data processing).
 * @returns {Object} A value the composition returns as the dataprocessing result.
 */


/**
 * The initalization object with optional properties to initialize composables.
 * @typedef {composableInitalizer} compositionInitalizer
 * @property {Object.<string,string>} [composables={}] - A dictionary of all composables used by the composition. 
 * The key represents the internal alias, the value represents 
 * the composable name, which is used to load the composable information.
 * 
 * @property {Object.<string, Array.<linkType>>} [links={}] - A dictionary describing an edge list of how the composables are linked.
 * The key describes the origin composable, the value describes an array of target composables with mapping information of the data properties.
 * @property {Composition~mapInputFunction} [mapInput] - A function to map the input object of the composition to the input object of individual composables.
 * The default requires an input object, where each property corresponds to a composable alias/name and maps the value of the property to this composable input.
 * @property {Composition~mapDataInFunction} [mapDataIn] - A function to map the data object of the composition to the data object of individual composables.
 * The default requires a data object, where each property corresponds to a composable alias/name and maps the value of the property to this composable data.
 * @property {Composition~mapDataOutFunction} [mapDataOut] - A function to transform the resulting data object of the composition, before making it available.
 * The default does not change the output object.
 */

/**
 * A composition can consist of multiple other compositions or composables.
 * It orchistrates the execution of the composables.
 * @constructor
 * @extends Composable
 * @param {compositionInitalizer} initializationObject - The object with optional properties for the composition.
 * 
 */
function Composition(initializationObject, manager) {
    this.manager = manager;

    this.initializeProperty(initializationObject, 'composables', {});
    this.initializeProperty(initializationObject, 'links', {});

    this.initializeFunction(initializationObject, 'mapInput', 4, function (input, composableName, composables, libs) {
        if (input.hasOwnProperty(composableName)) {
            return input[composableName];
        }
        return null;
    });

    this.initializeFunction(initializationObject, 'mapDataIn', 4, function (data, composableName, composables, libs) {
        if (data.hasOwnProperty(composableName)) {
            return data[composableName];
        }
        return null;
    });

    this.initializeFunction(initializationObject, 'mapDataOut', 2, function (output, libs) {
        return output;
    });
    //call to the parent class initalization function
    this.initialize(initializationObject);

    /**
    * Indicates, if the composition is ready to use. This is important, as required composables might need to be loaded first.
    * @protected
    * @name Composition#isReady
    * @type {boolean}
    */
    this.isReady = false;
}
//inherit properties
Composition.prototype = Object.create(Composable.prototype);

/**
 * This function starts to recursively load composables required by this composition.
 * See {@link ComposableLoader} for more details on he loading process.
 * When finished all required composables are in memory and can be used.
 * As loading is async it returns a promise. 
 * @returns {Promise<void>} An empty promise, signaling that everything was loaded.
 */
Composition.prototype.loadComposables = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        //collects an array of loading promises, which is then filled
        var promises = [];
        for (var key in self.composables) {
            if (self.composables.hasOwnProperty(key)) {
                //for each required composable the composable is loaded using the specified name of it
                //the name itself acts as a part of a URL
                //a reference to the composables dictionary of the composition is passed, so the
                //string values (names) of the required compositions are later replaced with the comosition objects,
                //which can then be used
                if (typeof self.composables[key] === 'string') {
                    promises.push(sweva.ComposableLoader.load(self.composables[key], self.composables, key));
                }
                else { //otherwise create from given object directly
                    var type = self.composables[key].type;
                    if(type=='module'){
                        self.composables[key] = new Module(self.composables[key], self.manager);
                    }
                    else {
                        self.composables[key] = new Composition(self.composables[key], self.manager);
                    }
                    
                }
                
            }
        }
        //invoke all promises and wait for them to finish
        Promise.all(promises).then(function () {
            //when all promises are finished, all components are loaded, so the composition is ready to be used
            self.isReady = true;

            //important: as we are dealing here with async operations, one might try to execute the composition, before
            //it is ready to be used. In this case the execution is delayed and indicated (wantsToExecute=true)
            //now if the loading is finished, it can directly start the execution directly itself, using the provided callback
            //no polling needed :)
            if (self.wantsToExecute) {
                self.wantsToExecute = false;
                self.executeStarterCallback();
            }
            
           
            //ok all loaded, now we can analyze graph and check for compatibility
            self.analyzeLinkGraph();
           
            //indicate to the outside, that we are done with everything and the composition can be used
            resolve();
        })
        .catch(function (error) {
            sweva.ErrorManager.error(
                       new ExecutionError('Could not load all composables: ' + error,
                       self.context, self.composables));
            
        });
    });
}
/**
 * Checks, if all the data a composable requires is already available.
 * As composables are executed in a graph, some composables depend on the calculations of others and have to wait for the data.
 * 
 * For this purpose, the {@link Composable#dataIn} property is used as a count, that has to be reached
 * by the amount of properties stored for this composable in {@links Composition#parameters}.
 * @protected
 * @param {string} composableName - The alias of the composable object, for which the check should be performed.
 * @returns {boolean} true, if all data required for the composable is available.
 */
Composition.prototype.hasParameters = function (composableName) {
    //how many parameters does the composable need?
    
    var parametersNeeded = [];
    if(typeof this.composables[composableName].dataInConnected !== 'undefined') {
        parametersNeeded = Object.keys(this.composables[composableName].dataInConnected);
    }
    
    
    //if it does not need any, we are good here
    if (parametersNeeded.length == 0) {
        return true;
    }
    
    //if we are still here, it needs at least one
    if (this.parameters.hasOwnProperty(composableName)) {
       
        
        //not enough
        for (var i = 0; i < parametersNeeded.length; i++) {
            var parameter = parametersNeeded[i];
            
            if (typeof this.parameters[composableName][parameter] === 'undefined') {
                return false;
            }
        }
        return true;
        
    }
    return false;
}

/**
 * Adds new data to the available pool other composables use.
 * This allows dependant composables to fetch the data and start execution.
 * It saves the data as a subkey of a subkey of {@links Composition#parameters}:
 * this.parameters[composable][property] = value
 * @protected
 * @param {string} composableName - The alias of the composable object for which the data is intended.
 * @param {string} property - The property name to save the data as, the value must correspond to a value defined
 * in {@links Composable#dataInNames} (we need correct mapping).
 * @param {Object|boolean|string|number} value - The value of the data to add.
 */
Composition.prototype.addParameter = function (composableName, property, value) {
    //if no key for composable present, create one
    if (!this.parameters.hasOwnProperty(composableName)) {
        this.parameters[composableName] = {};
    }

    this.parameters[composableName][property] = value;
}

/**
 * Resets the composition, so it can be executed again.
 * @protected
 */
Composition.prototype.reset = function () {
    this.parameters = {};    
    this.output = {};
    this.unlcearedComposables = [];
    for (var key in this.composables) {
        if (this.composables.hasOwnProperty(key)) {
            this.unlcearedComposables.push({
                composable: key,
                cleared: false
            });
        }
    }
    
}

/**
 * Checks, if the composable graph of the composition contains cycles (end therefore is not a DAG).
 * @protected
 * @param {Array.<string>} startingNodeArray - An array with the aliases of all composables, that do not have an incoming edge/link.
 * They are considered as the first nodes, that get executed.
 * @returns {boolean} True, if the graph contains cycles.
 */
Composition.prototype.hasCycles = function (startingNodeArray) {
    var nodes = {};
    var edges = {};

    //first create a copy of the composables in the composition (nodes)
    for (var key in this.composables) {
        if (this.composables.hasOwnProperty(key)) {
            nodes[key] = {}
        }
    }
    //create a copy of the links without mapping information (edges)
    for (var fromNode in this.links) {
        if (this.links.hasOwnProperty(fromNode)) {
            edges[fromNode] = [];

            for (var fromEndpoint in this.links[fromNode]) {
                if (this.links[fromNode].hasOwnProperty(fromEndpoint)) {
                    
                    for (var toNode in this.links[fromNode][fromEndpoint]) {
                        if (this.links[fromNode][fromEndpoint].hasOwnProperty(toNode)) {

                            edges[fromNode].push(toNode);

                        }
                    }

                }
            }
            /*for (var i = 0; i < this.links[key].length; i++) {
                edges[key].push(this.links[key][i].to);
            }*/
        }
    }

    
    //Kahn's algorithm
    //https://en.wikipedia.org/wiki/Topological_sorting
    var L = [];
    var S = startingNodeArray.slice();
    var uniqueL = true;
    while (S.length > 0) {
        var n = S.pop();

        //sorting only works, if all elements are unique!
        if (L.indexOf(n) >= 0) {
            uniqueL = false;
            break;
        }
        L.push(n);
        if (edges.hasOwnProperty(n)) {
            for (var i = 0; i < edges[n].length; i++) {
                var m = edges[n][i];
                edges[n].splice(i, 1);

                i--;

                var hasIncoming = false;
                for (var key in edges) {
                    if (edges.hasOwnProperty(key)) {
                        for (var k = 0; k < edges[key].length; k++) {
                            if (edges[key][k] == m) {
                                hasIncoming = true;
                                break;
                            }
                        }
                    }
                    if (hasIncoming) {
                        break;
                    }
                }
                if (!hasIncoming) {
                    S.push(m);
                }
                if (edges[n].length == 0) {
                    delete edges[n];
                    break;
                }
            }
        }
    }

    //if edges exist, or L has non unique elements: there is a cycle
    if (Object.keys(edges).length > 0 || !uniqueL) {
        return true;
    }
    return false;
}
/**
 * Checks, if the schemas of two objects are compatible.
 * Two objects are compatible, if one of them has no schema definition, or if the first schema is identical to the second one in a recursive comparison.
 * @protected
 * @param {string} obj1Name - The name of the first object (from). Only used for error output.
 * @param {string} obj2Name - The name of the second object (to). Only used for error output.
 * @param {JSONSchema} obj1Schema - The schema ofthe first object.
 * @param {JSONSchema} obj2Schema - The schema ofthe second object.
 * @param {string} [mappingFrom] - The relevant property name of the first object (source/from).
 * @param {string} [mappingTo] - The relevant property name of the second object (target/to).
 * @returns {boolean} True, if the object with obj1Schema can be used, where obj2Schema is required. 
 */
Composition.prototype.checkSchemaCompatibility = function (obj1Name, obj2Name, obj1Schema, obj2Schema, mappingFrom, mappingTo) {
    //schemas are optional (null), so give the benefit of the doubt
    if (obj1Schema == null || obj2Schema == null) { 
        return true;
    }
    //use to store error messages
    var error = null;

    //function for recursion, deals with the meta information level (type, properties, required, etc) of the JSONSchema
    //level indicates the poperty chain and is used for error messages
    function metaLevel(level, from, to) {
        //iterate over the target keys (obj2Schema)
        for (var key in to) {
            //the source (obj1Schema) must have all keys the target has
            if (key !== 'items' && key !== 'required' && !from.hasOwnProperty(key)) {
                error = {
                    level: level,
                    message: 'missing property "' + key + '"'
                }
                return false;
            }
            //if we are dealing with an array, proceed to the meta-level
            if (key === 'items' && from.hasOwnProperty(key)) {
                if (!metaLevel(level + '.' + key, from[key], to[key])) {
                    return false;
                }
            }
            //if properties are defined, proceed with the recursion using the propertyLevel
            else if (key === 'properties' && from.hasOwnProperty(key)) {
                if (!propertyLevel(level + '.' + key, from[key], to[key])) {
                    return false;
                }
            }
            //if we get to the required array...
            else if (key === 'required' && from.hasOwnProperty(key)) {
                //special: required array order should be ignored
                from[key].sort();
                to[key].sort();

                //first check if the length is the same
                if (from[key].length != to[key].length) {
                    error = {
                        level: level,
                        message: 'array length different for "' + key + '" ' + from[key].toString() + ' != ' + to[key].toString()
                    }
                    return false;
                }
                //otherwise we need to compare each element
                for (var i = 0; i < from[key].length; i++) {
                    if (from[key][i] !== to[key][i]) {
                        error = {
                            level: level,
                            message: 'array element difference for "' + key + '" ( ' + from[key][i] + ' != ' + to[key][i]
                                + ' ) ' + from[key].toString() + ' != ' + to[key].toString()
                        }

                        return false;
                    }
                }
            }
            //if we get something else, we compare the values
            //this should be all primitive types, but I'm not sure if I didn't miss any possible non-primitive
            //in the above if-else
            else if (from.hasOwnProperty(key)){
                if (from[key] !== to[key]) {
                    error = {
                        level: level,
                        message: 'inequal property value "' + key + '" ( ' + from[key] + ' != ' + to[key] + ' )'
                    }
                    return false;
                }
            }
        }
        return true;
    }

    //function for recursion, dealing with the enumeration of property keys of a schema
    function propertyLevel(level, from, to) {
        for (var key in to) {
            //from must have at least all keys to has
            if (!from.hasOwnProperty(key)) {
                error = {
                    level: level,
                    message: 'missing property "' + key + '"'
                }
                return false;
            }
            //continue, by checking the meta-level of each property
            if (!metaLevel(level + '.' + key, from[key], to[key])) {
                return false;
            }
        }
        return true;
    }

    var result = true;
    //helper function, that helps to narrow the scope, if a mappingTo/mappingFrom is given
    //it basically traverses the schema to the desired mapping property and returns it as the new schema
    function scopeOnMapping(schema, mapping) {
        var hasSchema = true;

        if (schema.hasOwnProperty('properties')) {
            if (schema.properties.hasOwnProperty(mapping)) {
                return schema.properties[mapping];
            }
            else {
                return null;
            }
        }

        return schema;
    }

    //copy the original schemas for error output (we might modify our reference later to narrow the scope, but 
    //we still want to show the full schema for the error message
    var OriginalObj1Schema = obj1Schema; 
    var OriginalObj2Schema = obj2Schema;

    //mappings are optional, so scheck if they are defined and narrow the scopes
    if (typeof mappingTo === 'string') {
        var temp = scopeOnMapping(obj2Schema, mappingTo);
        if (temp) {
            obj2Schema = temp;
        }
        else {
            error = {
                level: '',
                message: 'Composable "' + obj2Name + '" has no schema for property "' + mappingTo + '" provided by composable "' + obj1Name + '"'
            }
        }
    }

    if (typeof mappingFrom === 'string') {
        var temp = scopeOnMapping(obj1Schema, mappingFrom);
        if (temp) {
            obj1Schema = temp;
        }
        else {
            error = {
                level: '',
                message: 'Composable "' + obj1Name + '" has no schema for property "' + mappingFrom + '" required by composable "' + obj2Name + '"'
            }
        }
    }

    //if we didn't have an error yet, we can start the recursion
    
    if (!error) {
        result = metaLevel('', obj1Schema, obj2Schema);
    }

    //output an error message
    if (error) {
        var relevantMapping = '';
        if (typeof mappingFrom === 'string' && typeof mappingTo === 'string') {
            relevantMapping = ' for the mapping "' + mappingFrom + '" -> "' + mappingTo + '"';
        } else if (typeof mappingTo === 'string') {
            relevantMapping = ' for the mapping "' + mappingTo + '"';
        }

        var faultyObject = {};
        faultyObject[obj1Name] = OriginalObj1Schema;
        faultyObject[obj2Name] = OriginalObj2Schema;
        

        sweva.ErrorManager.error(
                      new DefinitionError('Schemas of "' + obj1Name + '" and "' + obj2Name + '" incompatible' + relevantMapping + ': '
            + error.level + ': ' + error.message,
                      this.context, faultyObject));
    }
    return result;
}
/**
 * Statically analyzes the graph before execution.
 * Checks for compatability of composables, absence of cycles in the linkage definition etc.
 * @protected
 */
Composition.prototype.analyzeLinkGraph = function () {
    /**
     * False, if no errors in the link graph definition were detected.
     * @protected
     * @name Composition#invalidLinkGraph
     * @type {boolean}
     */
    this.invalidLinkGraph = false;
    /**
     * Array of all the aliases of the composables, that have no ingoing link, i.e. the 'start'
     * @protected
     * @name Composition#startingComposables
     * @type {Array.<string>}
     */
    this.startingComposables = Object.keys(this.composables);
    /**
    * Dictionary of all the aliases of the composables, that have no outgoing link, i.e. the 'end'
    * Dictionary, because there will be some lookups of the key values later on.
    * @protected
    * @name Composition#startingComposables
    * @type {Object.<string,string>}
    */
    this.endingComposables = {};
    for (var key in this.composables) {
        if (this.composables.hasOwnProperty(key)) {
            this.endingComposables[key] = true;
        }
    }

    //find startingComposables that have no ingoing edges
    //find endingComposables that have no outgoing edges
   

    for (var fromNode in this.links) {
        if (this.links.hasOwnProperty(fromNode)) {
           

            for (var fromEndpoint in this.links[fromNode]) {
                if (this.links[fromNode].hasOwnProperty(fromEndpoint)) {

                    for (var toNode in this.links[fromNode][fromEndpoint]) {
                        if (this.links[fromNode][fromEndpoint].hasOwnProperty(toNode)) {
                            var toEndpoint = this.links[fromNode][fromEndpoint][toNode];
                            //check if linking to existing composable!
                            if (!this.composables.hasOwnProperty(toNode)) {
                                sweva.ErrorManager.error(
                                  new DefinitionError('Composable "' + fromNode + '" links to undefined composable "' + toNode + '"!',
                                  this.context, Object.keys(this.composables)));
                                this.invalidLinkGraph = true;
                            }
                            else {    
                                //composable has no such dataOut, it tries to map to another composable
                                if (this.composables[fromNode].dataOutNames.indexOf(fromEndpoint) < 0) {
                                    sweva.ErrorManager.error(
                                         new DefinitionError('Composable "' + fromNode + '" maps undefined dataOut "' + fromEndpoint + '" to composable "' + toNode + '"!',
                                         this.context, this.composables[fromNode].dataOutNames));
                                    this.invalidLinkGraph = true;
                                    break;
                                }

                                //composable has no such dataIn
                                if (this.composables[toNode].dataInNames.indexOf(toEndpoint) < 0) {
                                    sweva.ErrorManager.error(
                                         new DefinitionError('Composable "' + fromNode + '" links to undefined dataIn "' + toEndpoint + '" of composable "' + toNode + '"!',
                                         this.context, this.composables[toNode].dataInNames));
                                    this.invalidLinkGraph = true;
                                    break;
                                }
                                //additionally check for schema compatibility (optional)
                                if (this.composables[fromNode].dataOutSchema && this.composables[toNode].dataInSchema != null) {//schemas are optional, so only check if available
                                    var compatibleSchemas = this.checkSchemaCompatibility(fromNode, toNode, this.composables[fromNode].dataOutSchema, this.composables[toNode].dataInSchema,fromEndpoint, toEndpoint);
                                    if (!compatibleSchemas) {
                                        this.invalidLinkGraph = true;
                                        break;
                                    }
                                }
                                if (typeof this.composables[toNode].dataInConnected === 'undefined') {
                                    this.composables[toNode].dataInConnected = {};
                                }
                                this.composables[toNode].dataInConnected[toEndpoint] = true;

                            }
                            //if one composable A points to composable B, then B cannot be startingComposable
                            var propIndex = this.startingComposables.indexOf(toNode);
                            if (propIndex >= 0) {
                                this.startingComposables.splice(propIndex, 1);
                            }
                            //if one composable A points to composable B, then A cannot be endingComposable
                            
                            if (this.endingComposables.hasOwnProperty(fromNode)) {
                                delete this.endingComposables[fromNode]
                            }

                        }
                    }
                }
            }           
        }
    }


    

    //check for cycles
    var hasCycles = this.hasCycles(this.startingComposables);
    if (hasCycles) {
        sweva.ErrorManager.error(
                       new DefinitionError('There are cycles in the linkage of composables!',
                       this.context, this.links));
        this.invalidLinkGraph = true;
    }

    //extract implicit information
    this.dataIn = this.startingComposables.length;
    this.dataOut = Object.keys(this.endingComposables).length;

    this.dataInNames = [];
    this.dataOutNames = [];

    for (var i = 0; i < this.startingComposables.length; i++) {
       
        if (this.composables[this.startingComposables[i]].dataInNames.length>0) {
            this.dataInNames.push(this.startingComposables[i]);
        }        
    }
    for (var key in this.endingComposables) {
        if (this.endingComposables.hasOwnProperty(key)) {
            this.dataOutNames.push(key);
        }
    }
    
}
/**
 * Recursive function that executes all composables, as soon as they can be executed (have all required data available)
 * @param {string} context - Information about the execution context, see {@link Composable#context}
 * @protected
 */
Composition.prototype.composableQueueExecution = function (context) {
    
    //keep an array of all composables
    //executed composables get marked
    for (var i = 0; i < this.unlcearedComposables.length; i++) {

        //skip already executed composables
        if (this.unlcearedComposables[i].cleared) {
            continue;
        }
        
        var composableName = this.unlcearedComposables[i].composable;

        
       
        var data = null;
        var input = null;
        
        //check if composable has all data it depends on available
        
        if (this.hasParameters(composableName)) {
            
            //fill data and input for next composable call
            data = this.parameters[composableName];
           
            input = this.mapInput(this.input, composableName, this.composables, sweva.libs);
          
        }
        else {
            continue;
        }

        //not continued = composableName can be executed (has data vailable)
        var self = this;
        //closure function, to get the current composable for each function
        var func = function (composableName) {
            return function (output) {
                //check if composable does not provide data to other composables (end of execution chain)
                if (self.endingComposables.hasOwnProperty(composableName)) {
                    
                    var allCleared = true;
                    //if we have only one output composable, we do not need a named property,
                    //otherwise create a property using the ending-composable alias
                    if (Object.keys(self.endingComposables).length > 1) {
                        self.output[composableName] = output;
                    }
                    else {
                        self.output = output;
                    }

                    //check if this was the last composable (all have been executed)
                    for (var k = 0; k < self.unlcearedComposables.length; k++) {
                        if (!self.unlcearedComposables[k].cleared) {
                            allCleared = false;
                        }
                    }
                    //if this was the last endingComposable, finish
                    if (allCleared) {
                        self.executeFinishedCallback();
                    }                    
                }
                //if composable provides data to other composables 
                else {
                    if (self.links[composableName]) {

                        for (var fromEndpoint in self.links[composableName]) {
                            if (self.links[composableName].hasOwnProperty(fromEndpoint)) {

                                for (var toNode in self.links[composableName][fromEndpoint]) {
                                    if (self.links[composableName][fromEndpoint].hasOwnProperty(toNode)) {
                                        var toEndpoint = self.links[composableName][fromEndpoint][toNode];
                                            self.addParameter(toNode, toEndpoint, output[fromEndpoint]);                                            
                                    }
                                }
                            }
                        }                            
                    }
                }
                //recursive execution of the next composables, as this one just finished and probably resolved some data dependencies
                //console.log(self.parameters)

                self.manager.addReexecutionListener(function(result) {
                    self.needsReloadingVisualization = true;
                    self.progress = result.mqtt_sweva_parameters.data.progress;
                    self.context = result.mqtt_sweva_parameters.context;
                    self.parameters = result.mqtt_sweva_parameters.data.parameters;
                    self.output = result.mqtt_sweva_parameters.data.output;
                    self.mqtt_client = result.mqtt_sweva_parameters.data.client;
                    // if(result.lastReturnedData){
                    //     for (var key in self.composables) {
                    //       if(self.composables[key].name == result.name){
                    //           var output =  self.composables[key].dataOutNames[0];
                    //           for (var i in self.composables[key].dataInNames){
                    //             self.parameters[key][self.composables[key].dataInNames[i]] = result.lastReturnedData[output];
                    //           }
                    //       }
                    //     }
                    // }
                    self.unlcearedComposables = JSON.parse(JSON.stringify(result.mqtt_sweva_parameters.data.unclearedComposablesClone));
                    self.composableQueueExecution.apply(self, [self.context]);
                    console.log('recomputing demo result');
                }, self.mqtt_module_name);
                self.composableQueueExecution.apply(self, [context]);


            }

        };
        //mark composable as cleared
        if (!this.unlcearedComposables[i].cleared) {

            //Retrieve Data needed for the ASYNC calls of the MQTT nodes
            //Check if the current node about to be cleared is an MQTT node
          var mqtt_sweva_parameters = false;
          if (typeof this.composables[this.unlcearedComposables[i].composable].subscribe === 'function'){
            self.mqtt_module_name = this.composables[this.unlcearedComposables[i].composable].name;
            mqtt_sweva_parameters = {
              module_name: this.composables[this.unlcearedComposables[i].composable].name,
              context: context,
              data: {
                parameters: this.parameters,
                output: this.output,
                unclearedComposablesClone: JSON.parse(JSON.stringify(this.unlcearedComposables)),
                process: this.progress,
                client: this.mqtt_client
              }
            };
          } else {
            self.mqtt_module_name = false;
          }


            this.unlcearedComposables[i].cleared = true;
           
            //execute composable
            this.composables[composableName].execute(data, input, context, composableName, mqtt_sweva_parameters, this.progress)
                .then(
                    //a => console.log(a))
                    func(composableName))
                .catch(function (error) {
                    //error is logged earlier, but how to handle?
                });
        }

       
    }
}
/**
 * Starts execution of the composable, initializes required data. Use this function if you want to execute a composable!
 * @param {Object} data - The data relevant to the processing.
 * @param {Object} input - Input information on how to process the data.
 * @param {string} context - Execution context. See {@link Composable#context}.
 * @param {string} [alias] - Name, under which the composable is known to its parent.
 * @param {function} [progress] - Callback for progress tracking, gets called every time a module finishes execution.
 */
Composition.prototype.execute = function (data, input, context, alias, progress) {
    
    var self = this;
    this.data = data;
    this.input = input;
    context = this.getNewContext(context, alias);
    this.reset();
    
    this.progress = progress;
    
    //return a promise, since execution is async
    return new Promise(function (resolve, reject) {
        //do not bother executing, if link graph definition is invalid, or the provided data or input object do not match the provided schema definitions
        if (!self.invalidLinkGraph && self.validateTypes('dataIn', data) && self.validateTypes('input', input)) {
            //each starting composable has an own data part
            //use user-definable {@link Composition~mapDataInFunction} to map the data to the starting composables
            for (var i = 0; i < self.startingComposables.length; i++) {
                var composableName = self.startingComposables[i];               
                self.parameters[composableName] = self.mapDataIn(self.data, composableName, self.composables, sweva.libs);
            }
            
            //define callback for when execution is finished
            self.executeFinishedCallback = function (error) {
                if (error) {
                    sweva.ErrorManager.error(
                       new ExecutionError('Something unexpected happened: ' + error,
                       context, error));
                    reject(sweva.ErrorManager.getLastError());
                }
                //if there is no error
                else {
                    //use user-definable {@link Composition~mapDataOutFunction} to create the final output object
                    var result = self.mapDataOut(self.output, sweva.libs);
                    //validate output using provided schema
                    if (self.validateTypes('dataOut', result)) {
                        if(self.needsReloadingVisualization === true) {
                            self.manager.sendDataToVisualization(result);
                        }
                        resolve(result);
                    }
                    else {
                        reject(sweva.ErrorManager.getLastError());
                    }
                }
            }
            //all composables are loaded, so execution can start directly
            if (self.isReady) {
                self.composableQueueExecution.apply(self, [context]);
            }
                //delay execution to {@link Composition#loadComposables}
            else {
                //we want to execute, but cannot: tell so the initialization/loading part
                self.wantsToExecute = true;
                //execute via callback, as soon as loading finished
                self.executeStarterCallback = function () { 
                    self.composableQueueExecution.apply(self, [context]);
                }
            }
        }
        else {
            reject(sweva.ErrorManager.getLastError());
        }
    });
}

module.exports = Composition;
'use strict';

var Module = require('../../core/composables/module.js');
var Composition = require('../../core/composables/composition.js');
var DefinitionError = require('../../core/errors/definitionError.js');

/**
 * Responsible for dynamically loading composables from a web address.
 * Loaded composables are stored in an internal dictionary, so they only need to be downloaded once.
 * @constructor
 * @param {string} [basePath=''] - The base address from which to download the composable. Gets prepended to the composable name.
 * @param {string} [suffix=.json] - The suffix that gets appended to the composable name.
 */
function ComposableLoader(basePath, suffix) {
    /**
    * The base address from which to download the composable. Gets prepended to the composable name.
    * @name ComposableLoader#basePath
    * @type {string}
    */
    this.basePath = basePath || '';
    /**
    * The suffix that gets appended to the composable name.
    * @name ComposableLoader#suffix
    * @type {string}
    */
    this.suffix = suffix || '';
    /**
    * Dictionary of the composable names and the corresponding composable objects.
    * @name ComposableLoader#composables
    * @type {Object.<string, Composable>}
    */
    this.composables = {};
    /**
    * Dictionary of a waiting list, where loaded composables can be assigned to external objects
    * @name ComposableLoader#waitingList
    * @type {Object.<string, Object>}
    */
    this.waitingList = {};
}

/**
 * @returns {number} - The number of stored composables.
 */
ComposableLoader.prototype.size = function () {
    return Object.keys(this.composables).length;
}
/**
 * @param {string} name - The name of the composable to return.
 * @returns {Composable} - The composable object.
 */
ComposableLoader.prototype.get = function (name) {
    return this.composables[name];
}
/**
 * Composable objects can be directly added, without having to download them.
 * This can be used e.g. for rapid prototyping.
 * @param {string} name - The name of the composable to add.
 * @paranm {Composable} composable - The composable to add.
 */
ComposableLoader.prototype.add = function (name, composable) {
    this.composables[name] = composable;
}
/**
 * Converts a JSON representation of a composable into a full composable object.
 * Since composables can have custom functions defined, and JSON does not support functions, we cannot use JSON.parse.
 * Instead functions are encoded as string arrays in JSON and then assembled.
 * {@link SwevaScript} is used to sanitize the functions.
 *
 * @protected
 * @param {Object} json - The JSON object of the composable.
 * @param {string} context - The context of execution (for error messages).
 * @returns {composableInitalizer} - Composable initalization object.
 */
ComposableLoader.prototype.convertToObject = function (json, context) {
    var result = json;
    var self = this;
    for (var key in json) {
        if (json.hasOwnProperty(key)) {
           //decode base64 encoded binaries
            if(key === 'binary' && !(json[key] instanceof Uint8Array)) {
                /*console.log(json)
                console.log(context)
                console.log(json[key]);
                console.log(typeof json[key])*/
                let binaryList = atob(json[key]);
               json[key] = new Uint8Array(binaryList.split("").map(function(c) {
                   return c.charCodeAt(0);
               }));
            }

            //TODO: consider removing mapping functions
            if (key !== 'source' && (json[key] !== null && typeof json[key][0] === 'string')) {
                var str = String(json[key][0]);
                //check if string array starts with 'function' -> assemble function into object
                if (str.trim().indexOf('function') === 0) {
                    //first sanitize the script to prevent malicious code execution

                    json[key] = sweva.SwevaScript.sanitize(json[key].join('\n'),
                        function (error) {
                            sweva.ErrorManager.error(
                                new DefinitionError('Could not sanitize function "' + key + '" when loading "' + context + '": ' + error,
                                    context, self.convertJsonToCode(json)));
                        });
                }
            }

            /*//TODO: consider removing mapping functions
            if (key !== 'source' && typeof json[key][0] === 'string') {
                var str = String(json[key][0]);
                //check if string array starts with 'function' -> assemble function into object
                if (str.trim().indexOf('function') === 0) {
                    //first sanitize the script to prevent malicious code execution

                    json[key] = sweva.SwevaScript.sanitize(json[key].join('\n'),
                        function (error) {
                            sweva.ErrorManager.error(
                                new DefinitionError('Could not sanitize function "' + key + '" when loading "' + context + '": ' + error,
                                    context, self.convertJsonToCode(json)));
                        });
                }
            }*/

            if (typeof json[key] === 'object') {
                json[key] = this.convertToObject(json[key], context);
            }
        }
    }

    return result;
}
//TODO: replace default modules
ComposableLoader.prototype.getDefaultModule = function () {
    return "{\n    type: \'module\',\n    name: \'module1\',\n    description: \'A simple module template.\',\n    dataInNames: ['in'],\n    dataInSchema: {},\n    dataOutNames:[\'result\'],\n    dataOutSchema: {},\n    inputNames: ['input'],\n    inputSchema: {},\n    request: function (data, input, libs) {\n        return libs.axios.get(\'http:\/\/localhost:8080\/example\/calc\/add\/\');\n    },\n    response: function (response, input, libs) {\n        return { result:response.data }\n    }    \n}";
}
ComposableLoader.prototype.getDefaultComposition = function () {
    return "{\n    type: \'composition\',\n    name: \'composition1\',\n    dataInNames: [],\n    dataInSchema: {},\n    dataOutNames:[\'result\'],\n    dataOutSchema: {},\n    inputNames: [],\n    inputSchema: {},\n    mapDataIn: function (data, composableName, composables, libs) {\n        if (data.hasOwnProperty(composableName)) {\n            return libs.get(data, composableName);\n        }\n        return null;\n    },\n    mapDataOut: function (output, libs) {\n        return output;\n    },\n    mapInput: function (input, moduleName, modules, libs) {\n        if (input.hasOwnProperty(moduleName)) {\n            return libs.get(input, moduleName);\n        }\n        return null;\n    }\n}";
}

ComposableLoader.prototype.convertCodeToJson = function (string) {
    
    var result = ''
    var lines = string.split(/\r?\n/);
   
    var regexFunction = new RegExp(/^\s*(\w)+\s*:\s*function/);
    var regexProperty = new RegExp(/^\s*(\w)+\s*/);

    var funcLines = false;
    var funcLinesFirst = false;
    var braceCount = 0;
    var funcLinesJustFinished= false;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();        
        if (!funcLines) {
            if (funcLinesJustFinished && line.indexOf(':') >= 0) {
                funcLinesJustFinished = false;
                result += ',\n';
            }
            if (regexFunction.test(line)) {
                funcLines = true;

                var index = line.indexOf('function');

                var linePart = line.slice(0, index);
                var match = regexProperty.exec(linePart);
                if (match != null) {
                    linePart = linePart.slice(0, match.index) + '"' + linePart.slice(match.index, match.index + match[0].length) + '"' + linePart.slice(match.index + match[0].length);
                }
                linePart = linePart.replace(/'/g, '"');

                result += linePart;

                result += '["' + line.slice(index) + '",\n';
                funcLinesFirst = true;
            }
            else {
                var match = regexProperty.exec(line);
                if (match != null) {
                    line = line.slice(0, match.index) + '"' + line.slice(match.index, match.index + match[0].length) + '"' + line.slice(match.index + match[0].length);
                }
                line = line.replace(/'/g, '"');                
                result += line + '\n';
            }
        }
        if (funcLines) {
            var inQuotes = false;
            var inSingleQuotes = false;
            for (var k = 0; k < line.length; k++) {
                var c = line[k];

                if (c == '"' && !inSingleQuotes) {
                    inQuotes = !inQuotes;
                    line = line.slice(0, k) + '\\' + line.slice(k);
                    k++;
                }
                else if (c == '\'' && !inQuotes) {
                    inQuotes = !inSingleQuotes;
                }
                else if (c == '{' && !inQuotes && !inSingleQuotes) {
                    braceCount++;
                }
                else if (c == '}' && !inQuotes && !inSingleQuotes) {
                    braceCount--;
                }
            }
            if (funcLinesFirst) {
                funcLinesFirst = false;
            }
            else {
                line = line.replace('\\n', '\\\\n');
                if (braceCount == 0) {
                    if (line.length > 0 && line.indexOf(',') >= line.length - 1) {
                        line = line.slice(0, line.length - 1);
                    }
                    result += '"' + line + '"' + '\n';
                }
                else {
                    result += '"' + line + '"' + ',' + '\n';
                }
            }

            if (braceCount == 0) {
                funcLines = false;
                funcLinesFirst = false;
                result += ']\n';
                funcLinesJustFinished=true;
               
            }
        }
    }

    if (result.indexOf('{') !== 0) {
        return '{' + result + '}';
    }

    return result;
}
ComposableLoader.prototype.convertJsonToCode = function (obj) {
    function getSpaces(spaces) {
        var result = '';
        for (var i = 0; i < spaces; i++) {
            result += ' ';
        }
        return result;
    }
    function stringify(object, level, spaces) {
        var result = '';

        var ident = getSpaces(level * spaces);

        var keys = Object.keys(object);

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var keyString = (key.indexOf(' ') >= 0) ? ('\'' + key + '\'') : key;
            result += ident + keyString + ': ';
            if (typeof object[key] === 'string') {
                result += '\'' + object[key] + '\'';
            }
            else if (typeof object[key] === 'object') {
                if (Array.isArray(object[key])) {
                    var arrayContent = '';

                    if (object[key].length > 0 && typeof object[key][0] === 'string' && object[key][0].trim().indexOf('function') == 0) {
                        //decode function
                        var internalLevel = 0;
                        for (var k = 0; k < object[key].length; k++) {
                            var line = object[key][k].trim();
                            if (line.indexOf('}') == 0) {
                                internalLevel--;
                                if (internalLevel < 0) {
                                    internalLevel = 0;
                                }
                            }
                            arrayContent += (k == 0 ? '' : ident) + getSpaces(spaces * internalLevel) + line + (k >= object[key].length - 1 ? '' : '\n');
                            if (line.length > 0 && line.indexOf('{') == line.length - 1) {
                                internalLevel++;
                            }
                        }
                        result += arrayContent + ident;
                    }
                    else {
                        for (var k = 0; k < object[key].length; k++) {
                            var element = object[key][k];
                            arrayContent += ident + getSpaces(spaces);
                            if (typeof element === 'string') {
                                arrayContent += '\'' + element + '\'';
                            }
                            else if (typeof element === 'object') {
                                arrayContent += '{\n' + stringify(object[key], level + 1, spaces) + ident + '}';
                            }
                            else {
                                arrayContent += element;
                            }
                            if (k < object[key].length - 1) {
                                arrayContent += ',';
                            }
                            arrayContent += '\n';
                        }
                        result += '[\n' + arrayContent + ident + ']';
                    }
                }
                else {
                    result += '{\n' + stringify(object[key], level + 1, spaces) + ident + '}';
                }
            }

            else {
                result += '\'' + object[key] + '\'';
            }

            if (i < keys.length - 1) {
                result += ',';
            }
            result += '\n';
        }
        return result;
    }
    return '{\n'+stringify(obj, 1, 4)+'}';
}

/**
 * Helper function, that assigns the composables to the internal dictionary and optionally to external objects with a specified property.
 * This can be used to directly fill another external dictionary of composables, like the {@link Composition} composable dictionary.
 * @protected
 * @param {string} name - The name of the composable.
 * @param {Composable} composable - The composable object.
 * @param {Object} [assignToObject] - The external object to wich the composable should be assigned to.
 * @param {string} [property] - The porperty of the external object to wich the composable should be assigned to.
 */
ComposableLoader.prototype.assignLoadedComposables = function (name, composable, assignToObject, property) {
    this.composables[name] = composable;

    //check if the optional assignToObject is given
    if (typeof assignToObject !== 'undefined' && assignToObject !== null && typeof property === 'string') {
        assignToObject[property] = composable;
    }

    //deal with waitinglist: as the caller has to wait for 'then' we, can set the required values now with some delay
    if (this.waitingList.hasOwnProperty(name)) {
        //for each object, that waits for the composable to be assigned to
        for (var i = 0; i < this.waitingList[name].length; i++) {
            var assignTo = this.waitingList[name][i].assignTo;
            var prop = this.waitingList[name][i].prop;

            assignTo[prop] = composable;
        }
        //remove element from the waitingList
        delete this.waitingList[name];
    }
}
/**
 * Loads a composable by the given name from a web resource.
 * If no basePath was given in the constructor, use the full web address as the name.
 * @param {string} name - The name of the composable.
 * @param {Object} [assignToObject] - The external object to wich the composable should be assigned to.
 * @param {string} [property] - The porperty of the external object to wich the composable should be assigned to.
 * @returns {Promise<Composable>} - The loaded composable object.
 */
ComposableLoader.prototype.load = function (name, assignToObject, property) {
    var self = this;

    //return a promise, since loading is ansynchronuous
    return new Promise(function (resolve, reject) {
        //check if the name was already loaded or is currently being loaded
        if (self.composables.hasOwnProperty(name)) {
            //we have only our placeholder, no real value yet
            //this means the composable is currently requested, but not loaded
            if (self.composables[name] === true) {
                //put in waitinglist, which is checked after each load
                //but only, if it needs to be assigned externally
                if (typeof assignToObject !== 'undefined' && assignToObject !== null && typeof property === 'string') {
                    if (!self.waitingList.hasOwnProperty(name)) {
                        self.waitingList[name] = [];
                    }
                    self.waitingList[name].push({
                        assignTo: assignToObject,
                        prop: property
                    });
                }
                //load from dictionary
                resolve(self.composables[name]);
            }
            else {
                if (typeof assignToObject !== 'undefined' && assignToObject !== null) {
                    assignToObject[property] = self.composables[name];
                }
                resolve(self.composables[name]);
            }
        }
            //not already in dictionary, needs to be loaded
        else {
            //set key and prevent unnecessary loads, while loading is already in progress
            self.composables[name] = true;
            //construct url
            var url = self.basePath + name + self.suffix;

            sweva.axios.get(url)
            .then(function (response) {
                //convert the response JSON to an actual composable
                var composable = self.convertToObject(response.data, url);
                //closue function, dummy
                var func = function (comp) {
                    return function (res, rej) {
                        res(comp);
                    }
                }
                var internalPromise = new Promise(func(composable));

                //check if composable just extends existing one
                if (composable.hasOwnProperty('extends')) {
                    var baseComposableName = composable.extends;
                    //create a closure to load the base composable
                    var func2 = function (baseComposableName, composable) {
                        return function (res, rej) {
                            self.load(baseComposableName).then(function (comp) {
                                //extend loaded composable with extension
                                res(comp.extendWith(composable));
                            });
                        }
                    };
                    //adjust internal promise to load the base composable first, before extending it.
                    internalPromise = new Promise(func2(baseComposableName, composable));
                }

                internalPromise.then(function (composable) {
                    //log as loaded
                    console.log('loaded ' + composable.name);
                    //if the loaded composable is a module
                    if (composable.type == 'module') {
                        //construct Module
                        composable = new Module(composable);

                        self.assignLoadedComposables(name, composable, assignToObject, property);

                        resolve(composable);
                    }
                        //if the loaded composable is a composition
                    else {
                        //construct Composition
                        composable = new Composition(composable);

                        self.assignLoadedComposables(name, composable, assignToObject, property);
                        //load composables required for the composition
                        composable.loadComposables().then(function () {
                            resolve(composable);
                        });
                    }
                });
            })
            .catch(function (response) {
                reject(self.basePath + name + self.suffix); //could not load
            });
        }
    });
}
/**
 * Clears the internal dictionaries.
 */
ComposableLoader.prototype.clear = function () {
    this.composables = {};
    this.waitingList = {};
}
module.exports = ComposableLoader;
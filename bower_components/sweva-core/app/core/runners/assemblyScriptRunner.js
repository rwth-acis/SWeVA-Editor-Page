'use strict';

var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
var Runner = require('../../core/runners/runner.js');
var Compiler = require('../../core/compilers/assemblyScriptCompiler.js');
var Composable = require('../../core/composables/composable.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');
var DefinitionError = require('../../core/errors/ExecutionError.js');
var SupportLibrary = require('../../core/execution/supportLibrary.js');


/**
 * Parameters in the AssemblyScript run function starting with this string are used for the user inputs.
 */
const userInputSeparator = "input_";

/**
 * The AssemblyScript runner supports strict TypeScript
 *
 * @constructor
 * @extends Runner
 *
 */
function AssemblyScriptRunner() {
    this.supportLib = new SupportLibrary();
    this.supportLib.loadHTTP();
    this.supportLib.loadLogger();
    this.supportLib.loadTestSync();
    this.compiler = new Compiler(this.supportLib);
}

AssemblyScriptRunner.prototype.getHTMLDescription = function () {
    let description = "Find the official AssemblyScript documentation on <a href='https://www.assemblyscript.org/introduction.html' target='_blank'>assemblyscript.org</a>.\n" +
        "The exported <b>run</b> function will be called with the parameters as data inputs and returned data as an output called <b>out</b>. User inputs have to be prefixed with <b>input_</b> and be the first parameters.\n" +
        "Additional outputs are generated for exported global variables. This allows returning values resulting from asynchronous callbacks.\n" +
        "If the <b>run</b> function has the return type \"void\" no default output is generated.\n";
    description += "\n" + this.compiler.supportLibraryDocumentation;

    //HTML new lines
    description.replaceAll("\n", "<br>");
    return description;
};

//inherit properties
AssemblyScriptRunner.prototype = Object.create(Runner.prototype);
AssemblyScriptRunner.prototype.constructor = AssemblyScriptRunner;

AssemblyScriptRunner.prototype.name = "TypeScript (using AssemblyScript)";
AssemblyScriptRunner.prototype.id = "typescript";

//=== OFFLOADING === Module => ASC code to WASM binary
AssemblyScriptRunner.prototype.prepare = async function (module, callbackList = []) {
    let definitionData = null;

    if (!module.binary || module.binary.length === 0 || module.binaryHash !== this.calculateBinaryHash(module.binary)) {
        module.binaryHash = null;
        // monitored compilation in ASCcompiler.js
        let compilerResult = await this.compiler.compile(module);
            console.log('compilerResult');
            console.log(compilerResult);
            if (compilerResult === 'offloading') {
                //todo: Offloading needed
                console.log("offloading intercepted in ASCRunner.prepare()")
                return 'offloading';
            } else {
                module.binary = compilerResult.binaryData;
                module.binaryHash = this.calculateBinaryHash(module.binary);
                definitionData = compilerResult.definitionData;
            }
        }

    const moduleInstance = await AsBind.instantiate(module.binary, {
        module: this.generateFunctionDescription(callbackList)
    });

    if (definitionData != null)
        this.createDataSchema(module, moduleInstance, definitionData);

    return moduleInstance;
}


/**
 *  wrapper for
 */
AssemblyScriptRunner.prototype.generateFunctionDescription = function (callbackList) {
    let functions = {};

    for (let funcName in this.supportLib.functions) {
        let funcDesc = this.supportLib.functions[funcName];
        let functionReference;

        if (funcDesc.async) {
            //params has callback name as first argument followed by regular parameters
            functionReference = function (...params) {
                let callbackName = params[0];
                params.shift();

                callbackList.push({
                    promise: funcDesc.func(...params),
                    params: params,
                    funcName: funcName,
                    callbackName: callbackName
                });
            }
        } else {
            functionReference = funcDesc.func;
        }

        functions["lib." + funcName] = functionReference;
    }
    return functions;
}

AssemblyScriptRunner.prototype.exec = async function (module, data, input) {

    let callbackList = [];
    /*
    console.log("///////////// ASC runner inputs //////////////");
    console.log("module");
    console.log(module);
    console.log("data");
    console.log(data);
    console.log("input");
    console.log(input);
    console.log("///////////////////////////");
     */
    //compile and update schema
    let instance = await this.prepare(module, callbackList);
    console.log('instance');
    console.log(instance);
    if (instance === 'offloading') {
        console.log('offloading intercepted in ASCRunner.exec()');
        return 'offloading';

    }
    console.log('module prepared= ');
    console.log(module);

    let preparedParams = [];
    if (module.inputNames.length > 0)
        preparedParams = preparedParams.concat(this.findParamAssignment(module.inputNames, input, module.context));
    if (module.dataInNames.length > 0)
        preparedParams = preparedParams.concat(this.findParamAssignment(module.dataInNames, data, module.context));

    //Module input
    console.log('Module source code input');
    console.log(preparedParams);

    // returnValue returns the result from the binary execution of the WASM module
    let returnValue = instance.exports.run(...preparedParams);
    console.log('returnValue = ');
    console.log(returnValue);

    //finish executing all asynchronous functions ( if callback functions are needed by the module )
    while (callbackList.length > 0) {
        console.log("Remaining Callback: ");
        console.log(callbackList[0]);
        let result = null;
        try {
            //todo: monitor this?
            result = await callbackList[0].promise;

        } catch (err) {
            throw new ExecutionError("Error in support function " + callbackList[0].funcName + " with parameters " + callbackList[0].params + "!", module.context);
        }

        if (result !== null) {

            let callbackDescriptor = instance.typeDescriptor.exportedFunctions[callbackList[0].callbackName];
            if (!callbackDescriptor)
                throw new DefinitionError("Callback function with name " + callbackList[0].callbackName + " not found!", module.context);

            try {
                if (callbackList[0].callbackName != null && callbackList[0].callbackName !== "") {
                    //match number of parameters of callback
                    let callbackParamCount = callbackDescriptor.parameters.length;
                    let preparedResult = result.slice(0, callbackParamCount);
                    console.log(instance.typeDescriptor.exportedFunctions[callbackList[0].callbackName]);

                    //Todo: do something with callback returns?
                    let returnValue = instance.exports[callbackList[0].callbackName](...preparedResult);

                    if (returnValue)
                        console.log("Callback return: " + returnValue);
                }
            } catch (err) {
                throw new ExecutionError("Error while calling callback function " + callbackList[0].callbackName + " with parameters '" + result + "'!", module.context);
            }
        }
        callbackList.shift();
    }
    return this.collectOutputData(instance, returnValue);
}

AssemblyScriptRunner.prototype.collectOutputData = function (moduleInstance, returnValue) {
    let result = {};

    if (returnValue !== undefined) {
        result.out = returnValue;
    }
    console.log('AsBind');
    console.log(AsBind);
    console.log('moduleInstance');
    console.log(moduleInstance);


    for (let exportedObj in moduleInstance.exports) {
        if (moduleInstance.exports[exportedObj] instanceof WebAssembly.Global && !exportedObj.startsWith("__")) {
            result[exportedObj] = moduleInstance.exports[this.compiler.internalGetterPrefix + exportedObj]();
        }
    }
    console.log('result');
    console.log(result);
    return result;
}

AssemblyScriptRunner.prototype.findParamAssignment = function (names, values, context) {
    let preparedParams = [];
    for (let i in names) {
        let matchFound = false;
        if (values !== undefined && values != null) {
            for (let inputName in values) {
                if (names[i] === inputName) {
                    preparedParams.push(values[inputName]);
                    matchFound = true;
                }
            }
        }
        if (!matchFound)
            throw new DefinitionError("Mismatch between received and expected parameters!\nExpected \"" + names[i] + "\", but not contained in received parameters: " + JSON.stringify(values), context);
    }
    return preparedParams;
}


AssemblyScriptRunner.prototype.parseAssemblyScriptVariableNames = function (definitionData) {
    let paramNames = Array();
    let lines = definitionData.split("\n");
    for (let line in lines) {
        if (lines[line].indexOf("export function run") === 0) {
            let params = lines[line].substring(lines[line].indexOf('(') + 1, lines[line].indexOf(')')).split(', ');
            for (let i in params) {
                let paramName = params[i].substring(0, params[i].indexOf(":"));
                if (paramName.length > 0)
                    paramNames.push(paramName);
            }
        }
    }
    return paramNames;
}

AssemblyScriptRunner.prototype.createDataSchema = function (module, moduleInstance, definitionData) {
    let run = moduleInstance.typeDescriptor.exportedFunctions.run;

    //verify entrypoint exists
    if (run === undefined)
        throw new DefinitionError("Missing entrypoint: exported function named run is required, as an entrypoint.", module.context);

    //inputs
    //parse parameter names of run function - replace, if AssemblyScript API, to access parameter names becomes available
    let paramNames = this.parseAssemblyScriptVariableNames(definitionData);

    if (run.parameters.length !== paramNames.length)
        throw new DefinitionError("Parameter length mismatch! Parameters could not be parsed fully!", module.context);

    module.dataInNames = [];
    module.inputNames = [];
    module.dataInSchema = {type: "object", properties: {}};
    module.inputSchema = {type: "object", properties: {}};

    for (let i in run.parameters) {
        if (paramNames[i].startsWith(userInputSeparator)) {
            module.inputNames.push(paramNames[i]);

            module.inputSchema.properties[paramNames[i]] = {type: run.parameters[i]};
        } else {
            module.dataInNames.push(paramNames[i]);

            module.dataInSchema.properties[paramNames[i]] = {type: run.parameters[i]};
        }
    }

    //outputs
    module.dataOutNames = [];
    module.dataOutSchema = {type: "object", properties: {}};
    for (let exportedObj in moduleInstance.exports) {
        if (moduleInstance.exports[exportedObj] instanceof WebAssembly.Global && !exportedObj.startsWith("__")) {
            module.dataOutNames.push(exportedObj);
            module.dataOutSchema.properties[exportedObj] = {type: moduleInstance.typeDescriptor.exportedFunctions[this.compiler.internalGetterPrefix + exportedObj]}
        }
    }
    if (run.returnType !== 'void') {
        if (!module.dataOutNames.includes('out')) {
            module.dataOutNames.push('out');
            module.dataOutSchema.properties['out'] = {type: run.returnType}
        } else {
            throw new DefinitionError("Duplicate parameter called 'out'! Do not use 'out' as a name for exported variables!", module.context);
        }
    }
}


module.exports = AssemblyScriptRunner;
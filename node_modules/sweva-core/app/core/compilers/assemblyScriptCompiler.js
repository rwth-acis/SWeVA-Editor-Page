'use strict';

//var {asc, assemblyscript} = require('../../../node_modules/assemblyscript/dist/sdk.js');
//var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
//var AsBindTransform = require('../../../node_modules/as-bind/dist/transform.cjs');
var Runner = require('../../core/runners/runner.js');
var Compiler = require('../../core/compilers/compiler.js');
var AsBind = require('../../../node_modules/as-bind/dist/as-bind.cjs.js');
var Composable = require('../../core/composables/composable.js');
var ExecutionError = require('../../core/errors/ExecutionError.js');
var CompileError = require('../../core/errors/compileError.js');
const DefinitionError = require("../../core/errors/ExecutionError.js");
//var AssemblyScriptGetterTransform = require('./assemblyScriptGetterTransform.js');

/** include web-worker library for Nodejs **/

if(typeof Worker === 'undefined') {
    console.log("Loading Node worker module");
var WorkerNodeJS = require('../../../node_modules/web-worker/cjs/node');
}


/**
 * The AssemblyScriptCompiler supports strict TypeScript
 * 
 * @constructor
 * @extends Compiler
 *
 */
function AssemblyScriptCompiler(supportLib) {
    this.worker = null;
    this.internalGetterPrefix = "_internal_get_";
    this.supportLibraryDeclares = this.generateSupportLibraryDeclares(supportLib);
    this.supportLibraryDocumentation = "The lib namespace contains all function from the support library.\n" +
        "synchronous functions return their result immediately, while the callback for asynchronous functions is called after all currently running AssemblyScript code is finished.\n" +
        "Callback functions can have less parameters than the listed parameters, in which case only the first parameters are passed.\n" +
        "Functions:\n";
    this.resolveCompile = null;
}

//inherit properties
AssemblyScriptCompiler.prototype = Object.create(Compiler.prototype);
AssemblyScriptCompiler.prototype.constructor = AssemblyScriptCompiler;

/**
 * generates declare statements necessary, to access JavaScript functions from AssemblyScript
 * additionally the documentation is generated
 * @param supportLib
 */
AssemblyScriptCompiler.prototype.generateSupportLibraryDeclares = function (supportLib) {
    let docs = "";
    let declares = "namespace lib {\n";
    for(let funcName in supportLib.functions) {
        let returnSig = supportLib.functions[funcName].languageSpecific.typescript.returnSig || "void";
        let paramSig = supportLib.functions[funcName].languageSpecific.typescript.parameterSig;
        //callback function name is first parameter for asynchronous functions
        if(supportLib.functions[funcName].async) {
            paramSig = "callback: string | null" + (typeof paramSig !== undefined ? ", "+paramSig : "");
            returnSig = "void";
        }
        docs += funcName+":\n"+
            "  Description: "+supportLib.functions[funcName].description+"\n"+
            "  Parameters: \""+paramSig+"\"\n"+
            "  "+(supportLib.functions[funcName].async?
                "Async function: callback with signature \""+supportLib.functions[funcName].languageSpecific.typescript.returnSig+"\" required":
                "Sync function: returns \""+returnSig+"\"")+
            "\n";
        declares += "export declare function " + funcName + "(" + paramSig + "):" + returnSig + ";\n";
    }
    declares += "}";
    this.supportLibraryDocumentation = docs;
    console.log("Support functions:");
    console.log(this.supportLibraryDocumentation);
    console.log(declares)
    return declares;
}

AssemblyScriptCompiler.prototype.setup = async function () {
    var self = this;

    if(!this.setupCompleted) {
        return new Promise((resolve) => {
            console.log("Loading AssemblyScript compiler");

            this.initWorker();

            this.worker.onmessage = function (e) {
                //console.log(e.data);
                switch (e.data.type) {
                    case "setupComplete":
                        console.log("setup complete")
                        self.setupCompleted = true;
                        resolve();
                        break;
                    case "compileError":
                    case "compileResult":
                        if(self.resolveCompile != null) {
                            self.resolveCompile(e.data);
                        }
                        break;
                }
            }
        });
    }
}

AssemblyScriptCompiler.prototype.initWorker = function() {
    if(typeof this.worker != 'undefined' && this.worker != null) {
        this.worker.terminate();
    }

    //different path for NodeJS
    if(sweva.inBrowser) {
        console.log("Load worker for webbrowser");
        this.worker = new Worker('/node_modules/sweva-core/app/core/compilers/assemblyScriptCompilerWorker.js');
    } else {
        this.worker = new WorkerNodeJS('app/core/compilers/assemblyScriptCompilerWorker.js');
    }
}



AssemblyScriptCompiler.prototype.compile = async function (module) {
    const self = this;
    while(this.currentlyCompiling) {
        await new Promise(resolveWait => setTimeout(resolveWait, 1));
    }
    this.currentlyCompiling = true;

    //load compiler
    await this.setup()

    let doneCompiling = false;
    new Promise(resolve => setTimeout(resolve, 10000)).then(() => {
        if(!doneCompiling) {
            this.currentlyCompiling = false;
            this.initWorker();
            throw new CompileError("Compilation Timeout", module.context);
        }
    });

    let workerResult = await new Promise((resolve) => {
        this.resolveCompile = resolve;
        doneCompiling = true;
        this.worker.postMessage({type: "compile", source: self.prepareSourceCode(module.source)});
    });

    this.currentlyCompiling = false;


    this.resolveCompile = null;

    if(workerResult.type === "compileResult")
        return workerResult;
    else
        throw new CompileError(workerResult.message, module.context);
}

AssemblyScriptCompiler.prototype.prepareSourceCode = function(source) {
    let getters = this.generateGlobalGetters(source);
    let sourceStr = source.join("\n");
    return this.supportLibraryDeclares + sourceStr + getters;
}

AssemblyScriptCompiler.prototype.generateGlobalGetters = function(source) {
    let getters = "";
    for(let line in source) {
        if(source.includes(this.internalGetterPrefix)) {
            throw new CompileError("Do not use "+this.internalGetterPrefix+" for names in your source, as it is reserved for internal use.", "compileError");
        }
        else if(source[line].indexOf("export var") === 0) {
            let tmp = source[line].split('=')[0].split(':');
            let type = "anyref";
            if(tmp.length >= 2)
                type = tmp[1].split(/[\s=]+/).filter(x => x !== "")[0];
            else
                throw new CompileError("Exported variables require an explicit type! \n\""+source[line]+"\" does not contain a type.", "compileError");
            tmp = tmp[0].split(/[\s=]+/).filter(x => x !== "");
            let name = tmp[tmp.length-1];
            getters += "export function "+this.internalGetterPrefix+name+"():"+type+" { return "+name+"; }\n";
        }
    }

    return getters;
}

module.exports = AssemblyScriptCompiler;
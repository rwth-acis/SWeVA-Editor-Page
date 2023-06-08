//global object initialization
var globalObject;

var inBrowser = false;

try {
    if (window) {
        globalObject = window;
        inBrowser = true;
    }
}
catch (e) {
    globalObject = global;
}

//prevent loading everything twice on editor-page
if(!globalObject.sweva) {
    globalObject.sweva = {};

    globalObject.sweva.inBrowser = inBrowser;

    globalObject.sweva.asyncmqtt = require('../../node_modules/async-mqtt');

    var Ajv = require('../../node_modules/ajv/lib/ajv.js');
    globalObject.sweva.Ajv = new Ajv();

    var ComposableLoader = require('../../app/core/execution/composableLoader.js');
    globalObject.sweva.ComposableLoader = new ComposableLoader('');

    globalObject.sweva.ExecutionManager = require('../../app/core/execution/executionManager.js');

    var ErrorManager = require('../../app/core/errors/errorManager.js');
    globalObject.sweva.ErrorManager = new ErrorManager();

    var SwevaScript = require('../../app/core/swevaScript/swevaScript.js');
    globalObject.sweva.SwevaScript = new SwevaScript();

    var AssemblyScriptRunner = require('../../app/core/runners/assemblyScriptRunner.js');

    /*
    globalObject.sweva.axios = require('../../node_modules/axios/dist/axios.min.js');
    globalObject.sweva.libs = {
        axios: globalObject.sweva.axios,
        mqtt: globalObject.sweva.asyncmqtt,
        get: globalObject.sweva.SwevaScript.get,
        set: globalObject.sweva.SwevaScript.set,
        //mqttclient: globalObject.sweva.SwevaScript.client,
        //mqttsubscribe: globalObject.sweva.SwevaScript.subscribe,
        adddata: globalObject.sweva.SwevaScript.adddata
    }*/

    globalObject.sweva.runners = {};

    var typescript = new AssemblyScriptRunner();
    globalObject.sweva.runners[typescript.id] = typescript;
}

module.exports = globalObject.sweva;
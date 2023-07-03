'use strict';

var ExecutionError = require('../../core/errors/ExecutionError.js');
var Module = require('../../core/composables/module.js');
var Composition = require('../../core/composables/composition.js');

//MA
let potentialOffloadingTarget = require("../network/potentialOffloadingTarget.js");
let dataProcessingDevice = require("../network/dataProcessingDevice.js");

// **** P2P network ****
let peer = new Peer('',{
    host:"milki-psy.dbis.rwth-aachen.de",
    port:443,
    path:"/discoveryNetwork"
});
console.log('offloadingOutput$ Connection to the SWeVA P2P network successful!')
//Event-based script
//+++++++++ DEVICE is POT +++++++++
peer.on('connection', (connection) => {
    connection.on('data', (data) => {
        if (data === 'peer'){
            let msg = 'offloadingOutput$ Offloading request from device = ' + connection.peer;
            console.log(msg);
            potentialOffloadingTarget();
        }
    }); });
//+++++++++ DEVICE is DPD +++++++++

function broadcastToDiscoveryNetwork(intermediatePipelineAndResults) {
    console.log('offloadingOutput$ broadcasting to discovery network....');
    dataProcessingDevice(intermediatePipelineAndResults);
    peer.listAllPeers((peerIds) => {
        peerIds
            .filter((peerId) => peerId !== peer.id) // Filter out device ID
            .forEach((peerId) => {
                const conn = peer.connect(peerId);
                conn.on('open', () => {
                    //console.log('offloadingOutput$ Discovered Peer = ' + peerId);
                    conn.send('peer');
                });
                conn.on('error', (err) => {
                    console.error('Error discovering Peer : ' + peerId);
                    console.error(err);
                })
            });
    });
}

// **** END P2P network ****

// ************* Getters and Setters ****************

//default values
let odList = [50,50,50];
let orList = [50,50,false];
let intermediatePipeline = {};
let intermediatePipelineResults ={};
ExecutionManager.setODList = function (odListInput) {
    odList=odListInput;
}
ExecutionManager.getODList = function () {
    return odList;
}

ExecutionManager.setORList = function (orListInput) {
    orList=orListInput;
}
ExecutionManager.getORList = function () {
    return orList;
}

ExecutionManager.setInitialIntermediatePipeline = function (intermediatePipelineInput) {
    //prepare the intermediate pipeline for compatibility reasons
    for (let key in intermediatePipelineInput.composables) {
        if (intermediatePipelineInput.composables.hasOwnProperty(key)) {
            delete intermediatePipelineInput.composables[key].manager;
        }
    }
    intermediatePipeline = intermediatePipelineInput;

    console.log('Initializing intermediate pipeline =',intermediatePipeline);

}

ExecutionManager.getListOfPeers = function listOfPeers() {
    return new Promise((resolve) => {
        peer.listAllPeers((peerIds) => {
            const list = peerIds
                .filter((peerId) => peerId !== peer.id)
                .map((peerId) => peerId.toString());

            resolve(list);
        });
    });
};

//****** end Web GETTERS and SETTERS ***********

/**
 * An ExecutionManager is responsible for managing the execution process of compositions and modules.
 * It has two phases: A setup phase, were all dependencies are loaded and initialized and an execution phase,
 * that executes the composables by providing data and input objects to them.
 *
 * The setup needs to be done only once, while the execution can be repeated on different data.
 * @constructor
 * @param {string} [name] - Name of the execution manager.
 */
function ExecutionManager(name) {
    if (typeof name === 'string') {
        this.name = name;
    } else {
        this.name = 'ExecutionManager';
    }
    /**
     * Amount of how many modules are used currently.
     * @name ExecutionManager#modulesTotal
     * @type {number}
     */
    this.modulesTotal = 1;
    /**
     * Amount of how many modules have finished execution.
     * @name ExecutionManager#modulesDone
     * @type {number}
     */
    this.modulesDone = 0;
    /**
     * Callback to track progress, gets called everytime a module finishes.
     * @name ExecutionManager#progressCallback
     * @type {function}
     */
    this.progressCallback = null;
    this.updateVisualizationNotifier = null;

    this.reexecutionListeners = [];
}

/**
 * Registers the callback function to track progress.
 * @param callback
 */
ExecutionManager.prototype.onProgress = function (callback) {
    this.progressCallback = callback;
};

/**
 * Registers the callback function to update visualization on MQTT data received after reexecuting the sweva-graph.
 * @param {function} - Callback function for updating the visualization.
 */
ExecutionManager.prototype.onMQTTDataRecieved = function (callback) {
    this.updateVisualizationNotifier = callback;
};

ExecutionManager.prototype.sendDataToVisualization = function (result) {
    if (this.updateVisualizationNotifier !== null) {
        this.updateVisualizationNotifier(result);
    }
}


/**
 * Registers a callback function that gets called whenever any asynchronous node re-executes parts of the composition.
 *
 * @param callback
 */
ExecutionManager.prototype.addReexecutionListener = function (callback, module_name) {
    if (this.reexecutionListeners.length !== 0) {
        for (var key in this.reexecutionListeners) {
            if (this.reexecutionListeners[key].module_name === module_name) {
                this.reexecutionListeners.splice(key, 1);
            }
        }
        this.reexecutionListeners.push({
            callback: callback,
            module_name: module_name
        });

    } else if (module_name !== false) {
        this.reexecutionListeners.push({
            callback: callback,
            module_name: module_name
        });
    }

};

ExecutionManager.prototype.onModuleUpdate = function (module) {
    for (var i in this.reexecutionListeners) {
        if (this.reexecutionListeners[i].module_name === module.mqtt_sweva_parameters.module_name) this.reexecutionListeners[i].callback(module);
    }
};

/**
 * Initializes all required composables, loads dependencies, validates.
 *
 * (IF) PARSE pipeline to JS object self gloabl to the executionManager !
 *
 * @param {Array.<string|Composable>} executionArray - Array of composables that will be executed.
 * @param {boolean} [isPureObject=false] - Set this to true, if passing pure JavaScript Objects and not just JSON.
 */
//Global variable names



ExecutionManager.prototype.setup = function (executionArray, isPureObject) {

    //internal recursive function to count how many modules are currently used
    function countModules(composable) {
        if (typeof composable.composables === 'undefined') {
            return 1;
        } else {
            var count = 0;

            for (var key in composable.composables) {
                if (composable.composables.hasOwnProperty(key)) {
                    //console.log(key, composable.composables[key]);
                    count += countModules(composable.composables[key]);
                }
            }
            //console.log('UPDATED Composable =', composable);
            //console.log("Number of set up nodes in Composable: " + count);
            return count;
        }
    }

    var needsLoading = [];
    this.composables = {};
    this.isReady = false;

    this.wantsToExecute = false;
    //if it is not an array, make it one
    if (!Array.isArray(executionArray)) {
        executionArray = [executionArray];
    }
    var names = [];
    //for each composable, that will be executed
    for (var i = 0; i < executionArray.length; i++) {
        var composable = executionArray[i];
        //if composable is provided as string, i.e. name it needs to be loaded
        if (typeof composable === 'string') {
            names.push(composable);
            needsLoading.push(sweva.ComposableLoader.load(composable, this.composables, composable));
        }
        //otherwise a composable object is given
        else {
            if (typeof isPureObject === 'undefined' || !isPureObject) {
                composable = sweva.ComposableLoader.convertToObject(composable, 'JSON');
            }

            if (composable.type === 'module') {
                this.composables[composable.name] = new Module(composable, this);
                sweva.ComposableLoader.add(composable.name, this.composables[composable.name]);
            } else {
                this.composables[composable.name] = new Composition(composable, this);
                sweva.ComposableLoader.add(composable.name, this.composables[composable.name]);
                //composables of a composition need also to be loaded
                needsLoading.push(this.composables[composable.name].loadComposables());
            }
            names.push(composable.name);
        }
    }
    var self = this;

    //now wait for everything to load
    Promise.all(needsLoading).then(function () {
        //console.log('RAW Pipline / User Input=', composable);
        //let's check, how many modules are used in total to have a rough estimate for progress tracking
        var moduleCount = 0;
        for (var i = 0; i < executionArray.length; i++) {
            moduleCount += countModules(sweva.ComposableLoader.get(names[i]));

        }
        self.modulesTotal = moduleCount;
        self.modulesDone = 0;

        //composables should now contain everything
        self.isReady = true;
        console.log('all loaded');
        //if we want to execute, before setup is ready, it is delayed and continued from here
        if (self.wantsToExecute) {
            self.wantsToExecute = false;
            self.executeCallback();
        }
    })
        .catch(function (error) {
            sweva.ErrorManager.error(
                new ExecutionError('Could not load all modules: ' + error,
                    self.name, error));
        });
}

/**
 * Calculates the current progress state and calls the optionally registered progressCallback.
 * It counts the percentage of the modules that have finished execution.
 *
 * @param {string} alias - The alias of the module, under which it is known to the parent composition.
 * @param {string} name - The name of the module.
 * @param {string} context - The context under which the module is executed (its parents).
 */
ExecutionManager.prototype.progressUpdate = function (alias, name, context,result) {
    console.log('offloadingOutput$ Finished executing ',alias);
    if (result==='offloading')
        {
            console.log('OFFLOADING flag catched in Exec manager !');

            //prepare pipeline to be compatible for offloading
            for (let key in intermediatePipeline.composables) {
                if (intermediatePipeline.composables.hasOwnProperty(key)) {
                    delete intermediatePipeline.composables[key].manager;
                }
                const composablesNode = intermediatePipeline.composables[key];
                for (let prop in composablesNode) {
                    if (composablesNode[prop] === null) {
                        delete composablesNode[prop];
                    }
                }
            }

            intermediatePipeline =JSON.stringify(intermediatePipeline);

            intermediatePipelineResults= JSON.stringify(intermediatePipelineResults);
            let mergedPip ={intermediatePipeline:intermediatePipeline,intermediatePipelineResults:intermediatePipelineResults};

            //console.log('offloading the merged Pipeline...');
            //console.log(mergedPip);

            broadcastToDiscoveryNetwork(mergedPip); //Offload merged Pipeline to best POT


    }

    //detects an offloaded pipeline :)
    if (Object.keys(intermediatePipeline).length !== 0)
    {
        //consider result as linked nodes input
        let nodeLinks = intermediatePipeline.links;
        let moduleResult = result.out;

        if (nodeLinks.hasOwnProperty(alias)){
            let linksArray =Object.entries(nodeLinks[alias].out)[0];
            console.log(linksArray);

            intermediatePipelineResults[linksArray[0]]={
                "num":moduleResult
            };
            console.log(intermediatePipelineResults);
            delete intermediatePipeline.composables[alias];
        }else {

            //consider result as node output
            intermediatePipelineResults[alias]={
                "out":moduleResult
            };
            delete intermediatePipeline.composables[alias];
        }


    if (this.progressCallback !== null) {
        this.modulesDone++;

        var progress = this.modulesDone / +this.modulesTotal;

        //make a value 0-100 and cut off decimal places
        this.progressCallback((progress * 100).toFixed(0));

    }}
}



/**
 * Executes the composables that were initalized during {@link ExecutionManager#setup}.
 * @param {Object} data - The data to use for the execution. If multiple composables will be executed,
 * the data property names must correspond to the composable names for a correct mapping of the data.
 * @param {Object} input - The input object for the execution. If multiple composables will be executed,
 * the input property names must correspond to the composable names for a correct mapping of the input.
 */


ExecutionManager.prototype.execute = function (data, input) {
    /**
     * An Array of executions, which are representing Modules (nodes).
     * @type {Array}
     */
    var executions = [];
    var self = this;

    /*
    console.log("///////////// Exec Manager inputs //////////////");
    console.log("data");
    console.log(data);
    console.log("input");
    console.log(input);
    console.log('self');
    console.log(self);
    console.log('intermediate Pipeline');
    console.log(intermediatePipeline);
    console.log("///////////////////////////");
    */
    console.log('begin the execution');
    return new Promise(function (resolve, reject) {
        //closure function
        //composables is the pipeline
        //executions is the list of promises Module to be executed
        var func = function (composables, executions, resolve, reject) {
            /*
            console.log("///////////// func inputs //////////////");
            console.log('Composables= ');
            console.log(composables);
            console.log('Executions= ');
            console.log(executions);
            console.log("///////////////////////////");
            */
            return function () {

                var onlyOneComposable = false;
                // check if only one composable will be executed, because then you don't go into the loop.
                if (Object.keys(composables).length === 1) {
                    onlyOneComposable = true;
                }

                for (var key in composables) {
                    if (composables.hasOwnProperty(key)) {
                        /*
                        console.log("///////////// if condition //////////////");
                        console.log('composables[key]= ');
                        console.log(composables[key]);
                        console.log('input[key] ');
                        console.log(input[key]);
                        console.log('key= ');
                        console.log(key);
                        console.log('self.progressUpdate.bind(self)= ');
                        console.log(self.progressUpdate.bind(self));
                        console.log("///////////////////////////");
                        */
                        if (onlyOneComposable) {
                            //execute function is defined in module.js
                            executions.push(composables[key].execute(data, input, '', key, self.progressUpdate.bind(self)));
                            //console.log(" ====== Only One Composable ==== ");
                        } else {
                            //=== OFFLOADING === MODULE EXECUTION IS INITIALIZED !
                            executions.push(composables[key].execute(data[key], input[key] || {}, '', key, self.progressUpdate.bind(self)));
                            //console.log(" ====== More than 1 composable ==== ");
                        }

                    }
                }

                // while loop to monitor the execution of the pipeline and update the offloading pipeline

                //todo: implement a loop that updates a copy of the original pipeline each time a module is executed
                // ( promise is fullfilled) and stops and returns the updated pipeline if one promise is rejected
                //monitorPromises(executions);

                // ELSE NO OFFLOADING ...
                // when all the execution Promises have resolved...
                Promise.all(executions).then(function (results) {
                    console.log('all promises resolved');
                    if (onlyOneComposable) {
                        return resolve(results[0]);
                    }
                    resolve(results);
                }).catch(function (results) {
                    if (onlyOneComposable) {
                        return resolve(results);
                    }
                    sweva.ErrorManager.error(
                        new ExecutionError('Something unexpected happened: ' + results,
                            this.name, results));
                    reject(results);
                });
            }

        };

        if (self.isReady) {
            func(self.composables, executions, resolve, reject)();
        } else {
            self.wantsToExecute = true;
            self.executeCallback = func(self.composables, executions, resolve, reject);
        }
    });
}
//alias
ExecutionManager.prototype.run = ExecutionManager.prototype.execute;
module.exports = ExecutionManager


/*

//////////////  EXPERT MODE  //////////////

// inputs are extracted from device
ExecutionManager.prototype.deviceMonitoringIndex = async function () {
    async function deviceMonitoringIndex() {
        return new Promise((resolve, reject) => {
            //this.window = window;
            let metrics = [];

            //Hardware metrics in Linux environments:
            let cpu = await currentCPUusage()
            let mem = await currentMemoryusage()
            let storage = await availableStorage()
            let battery = await availableBattery()
            let charging = await isCharging()

            console.log("cpu",cpu,"\n mem", mem, "\n storage", storage, "\n battery", battery, "\n charging", charging);
            resolve(metrics.push(cpu, mem, storage,battery,charging));


            //for windows testing purposes
            let cpu = 60; //avg free cpu value for 3 measurements in %
            let mem = 100000; // avilable free mem value in bytes
            let storage = 2000000; // avilable free storage value in bytes
            let battery = 80;
            let charging = true;
            //console.log("cpu",cpu,"\n mem", mem, "\n storage", storage, "\n battery", battery, "\n charging", charging);
            metrics.push(cpu, mem, storage, battery, charging)
            resolve(metrics);

        })
    }

    return await deviceMonitoringIndex();

}
*/

/*
//inputs are extracted from frontend -> user input in backend
ExecutionManager.prototype.offloadingDecision = async function (od_CPU, od_mem, od_battery) {
    async function offloadingDecission(wpn, od_CPU, od_mem, od_battery) {
        return new Promise(async (resolve, reject) => {
            const dmi = await ExecutionManager.prototype.deviceMonitoringIndex();
            let decision = false;
            //[0]:cpu
            //[1]: memory
            //[2]: storage
            //dmi[3]: battery
            //dmi[4]: is charging
            if (od_CPU === 0 || od_mem === 0 || od_battery === 0) {
                decision = true;
            } else if (wpn[0] > (dmi[0] * od_CPU) || wpn[1] > (dmi[1] * od_mem) || dmi[3] < od_battery) {
                decision = true;
            }
            resolve(decision);
        });
    }

    return await offloadingDecission([sweva.ComposableLoader['totalCPUReq'], sweva.ComposableLoader['totalMemReq']], od_CPU, od_mem, od_battery);

}
*/

//////////////  END  EXPERT MODE  //////////////

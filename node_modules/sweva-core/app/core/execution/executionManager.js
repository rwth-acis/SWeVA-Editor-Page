'use strict';

var ExecutionError = require('../../core/errors/ExecutionError.js');
var Module = require('../../core/composables/module.js');
var Composition = require('../../core/composables/composition.js');
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
    }
    else {
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
 * @param {function} - Callback function for progress tracking. Has a number parameter with a value 0-100.
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
ExecutionManager.prototype.addReexecutionListener = function(callback, module_name) {
  if(this.reexecutionListeners.length !== 0) {
    for(var key in this.reexecutionListeners) {
      if (this.reexecutionListeners[key].module_name == module_name) {
        this.reexecutionListeners.splice(key,1);
      }
    }
      this.reexecutionListeners.push({
        callback: callback,
        module_name: module_name
      });

  } else if(module_name != false) {
    this.reexecutionListeners.push({
      callback: callback,
      module_name: module_name
    });
  }

};

ExecutionManager.prototype.onModuleUpdate = function(module) {
  for(var i in this.reexecutionListeners) {
    if(this.reexecutionListeners[i].module_name == module.mqtt_sweva_parameters.module_name) this.reexecutionListeners[i].callback(module);
  };
};

/**
 * Initializes all required composables, loads dependencies, validates.
 * @param {Array.<string|Composable>} executionArray - Array of composables that will be executed.
 * @param {boolean} [isPureObject=false] - Set this to true, if passing pure JavaScript Objects and not just JSON.
 */
ExecutionManager.prototype.setup = function (executionArray, isPureObject) {
   
    //internal recursive function to count how many modules are currently used
    function countModules(composable) {
        if (typeof composable.composables === 'undefined') {
            return 1;
        }
        else {
            var count = 0;

            for (var key in composable.composables) {
                if (composable.composables.hasOwnProperty(key)) {
                    count += countModules(composable.composables[key]);
                }
            }
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
            
            if (composable.type == 'module') {
                this.composables[composable.name] = new Module(composable, this);
                sweva.ComposableLoader.add(composable.name, this.composables[composable.name]);
            }
            else {
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
        //console.log(sweva.ComposableLoader.composables);
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
 * @param {string} alias - The alias of the module, under which it is known to the parent composition.
 * @param {string} name - The name of the module.
 * @param {string} context - The context under which the module is executed (its parents).
 */
ExecutionManager.prototype.progressUpdate = function (alias, name, context) {
    if (this.progressCallback !== null) {
        this.modulesDone++;

        var progress = this.modulesDone / +this.modulesTotal;
        
        //make a value 0-100 and cut off decimal places
        this.progressCallback((progress * 100).toFixed(0));
    }
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

  return new Promise(function (resolve, reject) {
    //closure function
    var func = function (composables, executions, resolve, reject) {
      return function () {

        var onlyOneComposable = false;
        // check if only one composable will be executed, because then you don't go into the loop.
        if (Object.keys(composables).length == 1) {
          onlyOneComposable = true;
        }

        for (var key in composables) {
          if (composables.hasOwnProperty(key)) {
            if (onlyOneComposable) {
              executions.push(composables[key].execute(data, input, '', key, self.progressUpdate.bind(self)));
            }
            else {
              executions.push(composables[key].execute(data[key], input[key] || {}, '', key, self.progressUpdate.bind(self)));
            }
          }
        }

        // when all the execution Promises have resolved...
        Promise.all(executions).then(function (results) {
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
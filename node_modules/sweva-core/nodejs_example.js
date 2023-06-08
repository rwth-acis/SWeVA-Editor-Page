var sweva = require('./app/core/core.js');
const examples = require("./app/examplePipelines");

var manager = new sweva.ExecutionManager();



async function runTests() {
    console.log("Time per execution in milliseconds");
    for(var i = 0; i < 10; i++){
        await testPipeLine()
    }
    console.log("Done!");
}

async function testPipeLine() {
    var now = performance.now();
    manager.setup(examples.simpleAssemblyScriptPipeline2);
    manager.onProgress(function (progress) {
        console.log(progress+"%");
    });
    let res = await manager.execute({
        "Node1": {
            "num": 8
        }
    }, {});

    console.log((performance.now() - now) + "ms");
    console.log(res);
}

runTests();
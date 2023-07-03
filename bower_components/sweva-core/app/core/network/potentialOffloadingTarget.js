
let availableOffloadingResources = require("../offloading/availableOffloadingResources");

function createPeer(id, callback = () => {
}) {
    let peer = new Peer(id, {
        host: "milki-psy.dbis.rwth-aachen.de", //localhost
        port: 443, //9001
        path: "/offloadingNetwork",
    });
    peer.on('open', function (ID) {
        console.log('offloadingOutput$ My peer ID is = ' + ID);
        callback();
    });
    peer.on("error", function (err) {
        console.log("Error: " + err);
    });
    peer.on('disconnected', function (ID) {
        console.log('peer ID ' + ID+' disconnected');
        callback();
    });

    return peer;
}

function potentialOffloadingTarget() {
    let peer = createPeer('', () => {
        peer.on('connection', (co)=>{
            console.log('offloadingOutput$ I am chosen by Source Peer !');
            co.on('data', (data)=>{
                // Process Pipeline and send result
                console.log('Data received from Source = ',data);
                //TODO: is there a way to check if received date is really a pipeline ? yes
                //TODO: user input ?
                console.log('offloadingOutput$ Processing offloaded pipeline ...');
                // setup and process the pipeline
                processPipeline(data).then((result)=>{
                    //send pipeline result
                    console.log('OFFLOADING RESULT = ');
                    console.log(result);
                    console.log('offloadingOutput$ Finished processing the offloaded pipeline')
                    co.send(result);
                    console.log('offloadingOutput$ Result sent to offloading source peer')

                }).catch(error => {
                    console.error(error);
                });
            });
        });

        const connection = peer.connect('source');
        connection.on('open', () => {
            console.log('offloadingOutput$ connected to peer = '+connection.peer);

            //TODO: get input from execution manager GET frontend.
            //input offloading resources limits MUST be global value from user input (frontend)
            let orList= sweva.ExecutionManager.getORList();
            console.log('orList GET in potentialOffloadingTarget = ',orList);
            availableOffloadingResources(orList).then(result => {

                console.log('result is =',result);

                    //push string 'dmi' as last entry in the array
                    result.push('dmi');
                    console.log(result);
                    //send dmi as array
                    connection.send(result);

            }).catch(error => {
                console.error(error);
            });
        });
    });
}
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) {
        return '0 Bytes';
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

    if (!isNaN(size)) {
        return `${size} ${sizes[i]}`;
    }
}

function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const minutes = Math.floor(milliseconds / (1000 * 60)) % 60;

    const formattedTime = [];

    if (minutes > 0) {
        formattedTime.push(minutes + (minutes === 1 ? ' minute' : ' minutes'));
    }
    if (seconds >0){
        formattedTime.push(seconds + (seconds === 1 ? ' second' : ' seconds'));
    }

    return formattedTime.join(', ');
}

//TODO: process pipeline in exe
async function processPipeline(receivedPipeline){
    //TODO: extract intermediate result from pipeline with a new key in the object

    console.log('entered processPipeline is POT ...');
    console.log(receivedPipeline);

    let {intermediatePipeline:ob1, intermediatePipelineResults:ob2} = receivedPipeline;
    console.log('pipeline = ',ob1);
    console.log('pipeline inputs = ',ob2);
    let pipeline = JSON.parse(ob1);
    let pipelineInputs = JSON.parse(ob2);
    console.log('pipeline = ', pipeline);
    console.log('pipeline inputs = ', pipelineInputs);


    try {
            let manager = new sweva.ExecutionManager();
            manager.setup(pipeline);

            let startMemExecute = performance.memory.usedJSHeapSize;
            let startTimeExecute = Date.now();
            let offloadedResult = await manager.execute(pipelineInputs, {});
            let endTimeExecute = Date.now();
            let endMemExecute = performance.memory.usedJSHeapSize;
            console.log('OUTPUT offloaded msg = ',offloadedResult);

            if (endMemExecute < startMemExecute) {
            let temp = endMemExecute;
            endMemExecute = startMemExecute;
            startMemExecute = temp;
            }

            console.log('offloadingOutput$ Offloaded task Execution time: ',formatTime(endTimeExecute-startTimeExecute),' (',endTimeExecute-startTimeExecute,' ms)');
            console.log('offloadingOutput$ Offloaded task Execution Memory: ',formatBytes(endMemExecute-startMemExecute),' (',endMemExecute-startMemExecute,' bytes)');
            return offloadedResult;
            }
        catch (e){
            console.log('Error encountered while executing the offloaded pipeline = ',e,'\nPlease try again');
            return 'Error encountered while executing the offloaded pipeline. Please try again';
    }

}

module.exports = potentialOffloadingTarget
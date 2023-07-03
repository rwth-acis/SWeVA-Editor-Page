let offloadingTarget = require("../offloading/offloadingTarget.js");

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

function dataProcessingDevice(pipeline) {
    let idAndDMIpairs = {};
    let connections = {};
    let allReceived = false;
    let peer = createPeer('source', () => {

        peer.on('connection', (connection) => {
            //to check which peer sent a msg and which didn't YET!
            connections[connection.peer]=false;
            console.log('offloadingOutput$ connected to peer = '+connection.peer);
            console.log(connections);
            connection.on('data', (data) => {

                if (Array.isArray(data) &&
                    data.length > 0 &&
                    data[data.length-1]==='dmi')
                {
                    console.log('received DMI from: ',connection.peer);
                    console.log(data);
                    //delete the flag
                    connections[connection.peer]=true;
                    console.log(connections);
                    idAndDMIpairs[connection.peer]= data;

                    allReceived= Object.values(connections).every(value => value === true);
                    console.log(allReceived);

                    //todo: have a timeout for robustness
                    if (allReceived){

                        return processMsgs();
                    }


                }else{
                    console.log( "Error encountered while receiving the dmi");
                    //TODO: error handling
                }


            });
        });
        function processMsgs () {

            console.log('entered processMsgs functions');
            let potId = offloadingTarget(idAndDMIpairs); //TODO: change processList to chooseBestPOT
            if (potId === null ){
                console.log( 'offloadingOutput$ No suitable peer in the SWeVA network found!');
            }else{
            console.log('offloadingOutput$ chosen potID for offloading = ' + potId);

            let conn = peer.connect(potId);
            conn.on('open', () => {
                console.log('offloadingOutput$ connection opened with chosen POT !');
                console.log('SENT PIPELINE = ',pipeline);
                console.log('Type of PIPELINE = ', typeof pipeline);
                conn.send(pipeline); //send pipeline here
            });

            conn.on('data', (data) => {

                console.log('Pipeline result: ');
                console.log(data); //receive pipeline results here

                console.log('offloadingOutput$ ===== Recieved offloaded Result =====');
                let msg = JSON.stringify(data);
                msg = 'offloadingOutput$ '+msg;
                console.log(msg);
                peer.disconnect();

            });


        }

        }
    });

}
module.exports =dataProcessingDevice
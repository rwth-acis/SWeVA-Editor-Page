
// input format orl = [cpu % , mem % , battery % , isCharging (binary)]

function decisionValueOfPOT(offloadingResourcesList){
    let advantageCPU = 1-offloadingResourcesList[0]; //idl NodeJS cpu usage in %
    let advantageMem = offloadingResourcesList[1]; // free memory in %

    // Advantage is more given to battery than CPU or mem, this could be user input

    //battery is charging= MAX advantage !
    let advantageBattery = 0;
    //battery is not charging
    if (!offloadingResourcesList[3]){
        advantageBattery = 100-offloadingResourcesList[2];
    }
    return advantageCPU + advantageMem - advantageBattery;
}


//We qualify by "best" the peer with highest current computation and battery

//input iDandORpairs= { id : [ or list ] }
function offloadingTarget (iDandORpairs){
    let bestPOTId=null;
    let temp = 0;
    for ( let key in iDandORpairs ){

        let dpot = decisionValueOfPOT(iDandORpairs[key]);
        console.log('PEER = '+key+' DPOD = '+dpot);
        if ( dpot>temp){
            temp=dpot;
            bestPOTId=key;
        }
    }
    console.log('offloadingOutput$ best POT is = ',bestPOTId);
    return bestPOTId;
}
module.exports = offloadingTarget
/*
//for testing purposes
let pairs = {
    'id1' : [10,20,60,false],
    'id2' : [50,30,100,false],
    'id3' : [99,40,10,true],
    'id4' : [ 0.00, 73.20, 80, false ]
}
offloadingTarget(pairs);
*/

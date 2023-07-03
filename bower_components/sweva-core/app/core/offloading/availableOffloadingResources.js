//USER input orList:

// for Web environment:
// orList = [mem%, battery%, isCharging (binary)]

//for Node.JS environment:
// orList = [cpu%, mem%, battery%, isCharging (binary)]

async function availableOffloadingResources(orList) {
    if (orList[0] === 0 || orList[1] === 0) {
        return [0,0,0,false];
    }

    let cpuLoad = 0;
    let memUsage = 0;
    let batteryPercent = 0;
    let batteryIsCharging = false;

    let listOfMetrics =[];
    if (typeof window !== 'undefined') {

        //Browser environment
        memUsage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        let battery = await navigator.getBattery();
        batteryPercent = battery.level * 100;
        batteryIsCharging = battery.charging;
        console.log('memUsage = ',memUsage,'battery = ',batteryPercent, 'isCharging = ',batteryIsCharging);

    }else{
        //NodeJS environment
        let si = require('systeminformation');

        await Promise.all ([
            si.currentLoad(),
            si.mem(),
            si.battery()
        ]).then(([cpu, mem, battery]) => {
            let memRSS = process.memoryUsage();
            memUsage =  (memRSS.rss / mem.available) * 100;
            cpuLoad = cpu.avgLoad;
            batteryPercent = battery.percent;
            batteryIsCharging = battery.acConnected;
            //current cpu load higher than user limit (only for Node.js environment)
            if (cpuLoad > orList[0]){
                return [0,0,0,false]
            }
            //console.log('cpu = ',cpuLoad, 'memUsage = ',memUsage,'battery = ',batteryPercent, 'isCharging = ',batteryIsCharging);
        }).catch((err) => {
            console.log('Error occurred extracting metrics in the NodeJS environment. ERROR = ' + err);
        });
    }

    if (
        memUsage > orList[0] || // mem usage is higher than limit
        batteryPercent < orList[1] || // battery is lower than minimum set by user
        batteryIsCharging !== orList[2]
    )
    {
        console.log('offloadingOutput$ Peer not chosen for the offloaded task.')
        return [0,0,0,false]
    }
    else{
    //Output metrics in percent %
        listOfMetrics.push(cpuLoad,(100-memUsage),batteryPercent,batteryIsCharging);
        return listOfMetrics;

    }

}
module.exports = availableOffloadingResources

/*
// TEST function for Node.js environment
setInterval(() =>{
const startTime = process.hrtime();
availableOffloadingResources([0,10,10,true]).then((result) => {
    const endTime = process.hrtime(startTime);
    console.log(result);
    console.log('Elapsed time: '+(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)+ ' ms');

});},3000);
*/


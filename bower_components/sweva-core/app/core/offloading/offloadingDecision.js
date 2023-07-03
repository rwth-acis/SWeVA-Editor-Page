/*
*
Use this function to monitor any SWeVA execution and determine necessity of offloading
based on CPU , Memory and Battery metrics. This function can be used in both
Web and NodeJS environments !
* USER Input odList = [Limit_cpu %, Limit_mem %, Limit_battery %]
*/

async function offloadingDecision(odList) {
    if (odList[0] === 0 || odList[1] === 0 || odList[2] === 0) {
        console.log('offloadingOutput$ Offloading Triggered while monitoring the execution!');
        return true;
    }
    let cpuLoad = 0;
    let memUsage = 0;
    let batteryPercent = 0;
    let offloading = false;
    if (typeof window !== 'undefined') {

        //Browser environment
        memUsage = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        let battery = await navigator.getBattery();
        batteryPercent = battery.level * 100;
        //console.log('Measured mem = ',memUsage,'battery = ',batteryPercent);

    } else {

        //NodeJS environment
        let si = require('systeminformation');

        await Promise.all ([
            si.currentLoad(),
            si.mem(),
            si.battery()
        ]).then(([cpu, mem, battery]) => {
            let memRSS = process.memoryUsage();
            memUsage = (memRSS.rss / mem.available) * 100;
            cpuLoad = cpu.avgLoad;
            batteryPercent = battery.percent;
            console.log('cpu = ',cpuLoad, 'mem = ',memUsage,'battery = ',batteryPercent);
        }).catch((err) => {
            console.log('Error occurred extracting metrics in the NodeJS environment. ERROR = ' + err);
        });
    }
            if (cpuLoad > odList[0]) {
                console.log('offloadingOutput$ Monitoring = CPU limit exceeded');
                offloading = true;
            } else if (memUsage > odList[1]) {
                console.log('offloadingOutput$ Monitoring = Memory limit exceeded');
                offloading = true;
            } else if (batteryPercent < odList[2]) {
                console.log('offloadingOutput$ Monitoring = Battery limit exceeded');
                offloading = true;
            }

    return offloading;
}
module.exports = offloadingDecision




/*
// TEST function for Node.js environment

//let time =0;
let i=0;
let odList =[10,10,90];
let startTime = null;
let endTime =null;
let avgList=[] ;


setInterval(()=>{
       startTime = process.hrtime();
       offloadingDecision(odList).then ((result)=>{
       endTime = process.hrtime(startTime);

       console.log('Monitoring Round #'+i);
       i++;
       console.log(result);
       console.log('Elapsed time: '+(endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)+ ' ms');
   });


},3000);
*/



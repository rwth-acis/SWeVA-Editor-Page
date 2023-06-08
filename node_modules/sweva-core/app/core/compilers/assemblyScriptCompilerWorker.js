/** load requirejs only for webbrowsers */
if(typeof require != "function")
{
    importScripts("/node_modules/requirejs/require.js");
    require([ "/node_modules/assemblyscript/dist/sdk.js",  ], ({ asc, assemblyscript }) => {
        define("visitor-as/as", [], assemblyscript);
        require(["/node_modules/as-bind/dist/transform.amd.js"], asbind => {

            asc.ready.then(() => {
                self.asc = asc;
                self.asbind = asbind;
                self.assemblyscript = assemblyscript;

                postMessage({type: 'setupComplete'});
            });
        });
    });
}
else {
    var sdk = require("../../../node_modules/assemblyscript/dist/sdk.js");

    var assemblyscript = sdk.assemblyscript;
    var asc = sdk.asc;

    var asbind = require("../../../node_modules/as-bind/dist/transform.cjs.js")

    asc.ready.then(() => {
        self.asc = asc;
        self.asbind = asbind;
        self.assemblyscript = assemblyscript;

        postMessage({type: 'setupComplete'});
    });
}




onmessage = function(e) {
    switch(e.data.type) {
        case "compile":
            //console.log(e.data);
            const stdout = self.asc.createMemoryStream();
            const stderr = self.asc.createMemoryStream();
            let binaryData = null;
            let definitionData = null;
            self.asc.main([
                "module.ts",
                "-O3",
                //"--debug",
                "--runtime", "stub", //minimal runtime: garbage collection is not required, as instance is restarted after every execution
                "--exportRuntime",
                "--tsdFile", "module.tsd", //TypeScript Definitions for parameter name detection
                "--binaryFile", "module.wasm",
                "--exportTable",
                //"--textFile", "module.wat",
                //"--sourceMap"
            ], {
                stdout,
                stderr,
                transforms: [/*AssemblyScriptGetterTransform, */self.asbind],
                readFile(name, baseDir) {
                    //console.log("Read "+name);
                    return name === "module.ts" ? e.data.source : null;
                },
                writeFile(name, data, baseDir) {
                    //console.log("WRITE " + name + " (" + data.length + " Bytes)");
                    if (name === "module.wasm")
                        binaryData = data;
                    if(name === "module.tsd")
                        definitionData = data;
                    if(binaryData != null && definitionData != null)
                        postMessage({type: "compileResult", definitionData: definitionData, binaryData: binaryData});
                },
                listFiles(dirname, baseDir) {
                    return [];
                }
            }, err => {
                if (err) {
                    let errorMessage = "--- AssemblyScript Compile Error ---\n" +
                        err+"\n" +
                        "STDOUT: "+stdout.toString()+"\n" +
                        "STDERR: "+stderr.toString();
                    //console.log(errorMessage);
                    console.log(errorMessage);
                    postMessage({type: "compileError", message: errorMessage});
                }
            });
            break;
    }
}
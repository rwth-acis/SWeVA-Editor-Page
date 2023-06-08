var sweva = require('./app/core/core.js');
//const examples = require("./examplePipelines.js");

const http = require("http");

const host = 'localhost';
const port = 5005;

var manager = new sweva.ExecutionManager();


/** USAGE:
 * Use call /test to execute one of the test pipelines
 * HTTP post request to /executeModule containing JSON with module: SWEVA module, data: input data object, input user input data object
 * returns: result of the module with the specified parameters as JSON
 * */

const requestListener = function (req, res) {

    console.log("Request for: "+req.url);
    if ((req.url === '/executeModule' || req.url === '/executePipeline' )&& req.method === "POST") {
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);

        var data = [];
        req.on('data', function(chunk) {
            data.push(chunk);
        }).on('end', function() {
            try {
                var httpPostData = JSON.parse(Buffer.concat(data).toString());

                if(req.url === '/executeModule') {
                    //execute module
                    sweva.runners.typescript.exec(httpPostData.module, httpPostData.data, httpPostData.input).then(result => {

                        res.end(JSON.stringify(result));
                    });
                }else {
                    //execute pipeline
                    manager.setup(httpPostData.pipeline);
                    manager.execute(httpPostData.start, httpPostData.data, httpPostData.input).then(result => {

                        res.end(JSON.stringify(result));
                    });
                }
            } catch (e){
                res.end("Invalid module or parameters: "+e);
            }
        });
    } else if (req.url === '/test') {

        console.log("\n\n--- Starting test of pipeline 2 ---");
        var now = Date.now();
        try {
            manager.setup(simpleAssemblyScriptPipeline2);
            manager.onProgress(function (progress) {
                console.log("Progress: "+progress+"%");
            });


            manager.execute({
                "Node1": {
                    "num": 8
                }}, {}).then(result => {
                console.log('time ' + (Date.now() - now) + 'ms');
                
                res.setHeader("Content-Type", "application/json");
                res.writeHead(200);
                res.end(JSON.stringify(result));
            });

        }catch (e){
            res.end("Invalid module or parameters: "+e);
        }


    }
    else {
        res.writeHead(404);
        res.end('Invalid Request!');
    }
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log("SWEVA execution service is running on http://"+host+":"+port);
    console.log("Send a HTTP GET request to http://"+host+":"+port+"/test to run a test pipeline (opening in a browser for example).");
});


var simpleAssemblyScriptPipeline2 = {
    "type": "composition",
    "name": "composition1",
    "dataInNames": [],
    "dataInSchema": {},
    "dataOutNames": [
        "result"
    ],
    "dataOutSchema": {},
    "inputNames": [],
    "inputSchema": {},
    "composables": {
        "Node1": {
            "type": "module",
            "name": "module1",
            "description": "A simple module template.",
            "dataInNames": [
                "num"
            ],
            "dataInSchema": {},
            "dataOutNames": [
                "out"
            ],
            "dataOutSchema": {},
            "inputNames": [],
            "inputSchema": {},
            "requirements": {
                "cpu":0.05,
                "memory":21
            },
            "source": [
                "export function run(num: i32): i32 {",
                "var a = 0, b = 1",
                "if (num > 0) {",
                "while (--num) {",
                "let t = a + b",
                "a = b ",
                "b = t ",
                "}",
                "return b",
                " }",
                "return a ",
                " }"
            ]
        },
        "Node2": {
            "type": "module",
            "name": "module2",
            "description": "A simple module template.",
            "dataInNames": [
                "num"
            ],
            "dataInSchema": {},
            "dataOutNames": [
                "out"
            ],
            "dataOutSchema": {},
            "inputNames": [],
            "inputSchema": {},
            "requirements": {
                "cpu":0.05,
                "memory":21
            },
            "source": [
                "export var testvar32:i32 = 7888;",
                "export var testvarArr8:i8[] = [1,2,3];",
                "export var testvarArr32:i32[] = [1,2,300];",
                "export var testvarArrArr32:i32[][] = [[1,2,3],[4,5,6]];",
                "export var testvarArrFl:f32[] = [1.3,2.2,300.3];",
                "export var testvarArrStr:string[] = [\"String test a\",\"test b\",\"test c\"];",
                "export function run(num: i32): i32 {",
                "testvar32 = num;",
                "return num;",
                "}"
            ]
        }
    },
    "links": {
        "Node1": {
            "out": {
                "Node2": "num"
            }
        }
    },
    "controls": [
        {
            "label": "Section1",
            "controls": []
        }
    ],
    "visualization": ""
};

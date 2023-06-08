'use strict';

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
      "description": "plaA simple module temte.",
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
    },
    "Node3": {
      "type": "module",
      "name": "module3",
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
    },"Node2": {
      "out":{
        "Node3": "num"
      }
    }  },
  "controls": [

  ],
  "visualization": ""
};

var frontend = {
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
  "mapDataIn": [
    "function (data, composableName, composables, libs) {",
    "if (data.hasOwnProperty(composableName)) {",
    "return libs.get(data, composableName);",
    "}",
    "return null;",
    "}"
  ],
  "mapDataOut": [
    "function (output, libs) {",
    "return output;",
    "}"
  ],
  "mapInput": [
    "function (input, moduleName, modules, libs) {",
    "if (input.hasOwnProperty(moduleName)) {",
    "return libs.get(input, moduleName);",
    "}",
    "return null;",
    "}"
  ],
  "composables": {
    "Node145": {
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
        "cpu": 0.05,
        "memory": 21
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
    "Node239": {
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
        "cpu": 0.05,
        "memory": 21
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
    "Node145": {
      "out": {
        "Node239": "num"
      }
    }
  },
  "controls": [
    {
      "label": "Section1",
      "controls": [
        {
          "type": "number",
          "label": "num",
          "description": "",
          "value": "8",
          "map": [
            "input.Node145.num"
          ]
        },
        {
          "type": "",
          "map": []
        }
      ]
    }
  ],
  "visualization": "localhost:8000"
};

//export{simpleAssemblyScriptPipeline2};

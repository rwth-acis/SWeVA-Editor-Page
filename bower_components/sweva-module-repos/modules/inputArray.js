{
    "type": "module",
    "name": "module2",
    "description": "Output an array of type i8, i32 and f32",
    "dataInNames": [
],
    "dataInSchema": {},
    "dataOutNames": [
    "out"
],
    "dataOutSchema": {},
    "inputNames": [],
    "inputSchema": {},
    "source": [
    "export var a:i8[] = [1,2,3];",
    "export var b:i32[] = [1,2,300];",
    "export var c:i32[][] = [[1,2,3],[4,5,6]];",
    "export var d:f32[] = [1.3,2.2,300.3];",
    "export function run(): i8 {",
    "return a;",
    "}"
]
}
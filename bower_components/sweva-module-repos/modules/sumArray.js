{
    "type": "module",
    "name": "SumArray",
    "description": "Calculate the sum of elements in an array",
    "dataInNames": [
    "arr"
],
    "dataInSchema": {},
    "dataOutNames": [
    "out"
],
    "dataOutSchema": {},
    "inputNames": [],
    "inputSchema": {},
    "source": [
    "export function run(arr: i32[]): i32 {",
    "  var sum: i32 = 0;",
    "  for (let i: i32 = 0, len: i32 = arr.length; i < len; i++) {",
    "    sum += arr[i];",
    "  }",
    "  return sum;",
    "}"
]
}
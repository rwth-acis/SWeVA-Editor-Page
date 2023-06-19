{
    "type": "module",
    "name": "Factorial",
    "description": "Calculate the factorial of a number",
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
    "  var result: i32 = 1;",
    "  for (let i: i32 = 1; i <= num; i++) {",
    "    result *= i;",
    "  }",
    "  return result;",
    "}"
]
}
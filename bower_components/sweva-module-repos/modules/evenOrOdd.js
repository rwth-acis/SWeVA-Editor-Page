{
    "type": "module",
    "name": "EvenOrOdd",
    "description": "Check if a number is even or odd",
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
    "export function run(num: i32): string {",
    "  return num % 2 === 0 ? 'Even' : 'Odd';",
    "}"
]
}
}
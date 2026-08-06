export const EXAMPLE_TEXT = `// welcome — this is a notepad calculator
// write math, it evaluates as you type

=== Income & Sales ===
salary = 4,500
freelance = 1,200
subtotal

=== Monthly Expenses ===
rent = 1,650
groceries = 450
utilities = 180
subtotal

=== Currency, Gold & Crypto ===
10$ + 500 tl
1 gram gold to tl
1 btc to usd

=== Units & Percentages ===
5 miles to km
20% off 89.99

=== Date Math ===
start = today
deadline = start + 2 weeks - 1 day

=== Grand Summary ===
total`

export const RESERVED_KEYWORDS = new Set([
  'to', 'in', 'of', 'off', 'increase', 'decrease', 'by',
  'prev', 'total', 'subtotal', 'today', 'now',
  'pi', 'e', 'i', 'tau', 'phi',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sec', 'csc', 'cot',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'sqrt', 'cbrt', 'abs', 'sign', 'ceil', 'floor', 'round', 'fix',
  'exp', 'log', 'log2', 'log10', 'ln', 'pow', 'factorial', 'mod',
  'min', 'max', 'sum', 'mean', 'median', 'mode', 'std', 'var', 'prod', 'gcd', 'lcm',
  'deg', 'rad', 'grad',
  'true', 'false', 'null', 'undefined', 'nan', 'infinity'
])

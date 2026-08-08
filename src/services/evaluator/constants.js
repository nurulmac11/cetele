export const EXAMPLE_TEXT = `// welcome — this is çetele notepad calculator
// write math, currencies, gold, crypto, date math & multipliers naturally

=== Income & Multipliers 🚀 ===
salary = 500k
freelance = 1.2m
investments = $2.5m
subtotal

=== Living Expenses & Discounts ===
rent = 1.65k
groceries = 450
utilities = 180
tech_deal = 20% off 1.5k
subtotal

=== Currency, Gold & Crypto ===
500k tl to usd
1 gram gold to tl
1 ceyrek gold to tl
portfolio = 0.5 btc + 2 eth to usd

=== Units & Percentages ===
12 km to miles
increase 2.5m by 15%
15% of 240

=== Date Math & Deadlines 📅 ===
start_date = today
launch_event = start_date + 2 weeks - 1 day
flight_time = now + 4 hours - 15 mins

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

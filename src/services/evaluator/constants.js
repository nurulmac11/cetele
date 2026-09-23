export const EXAMPLE_TEXT = `// welcome — this is çetele notepad calculator
// write math, currencies, gold, crypto, dates & units naturally
// tips: Ctrl+K searches every tab · Alt+click a result to insert its #line · Tab accepts suggestions

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
laptop = 1,200 + %20 kdv
average
subtotal

=== Currency, Gold & Crypto ===
500k tl to usd
1 gram gold to tl
1 çeyrek altın to tl
portfolio = 0.5 btc + 2 eth to usd
1000 usd to tl @ 2020-01-02 // rates on a past day, back to 1999

=== Loans & Growth 🏦 ===
mortgage = loan(250k, 3.5%, 30 years)
savings = compound(10k, 5%, 10 years)
#12 * 12 // yearly rent, using a line reference

=== Units & Percentages ===
12 km to miles
100 km/h to mph
20 C to F
increase 2.5m by 15%
15% of 240

=== Date Math & Deadlines 📅 ===
start_date = today
launch_event = start_date + 2 weeks - 1 day
flight_time = now + 4 hours - 15 mins
days until launch_event
days since 2024-01-01

=== Grand Summary ===
total`

export const MONTHLY_BUDGET_TEXT = `// 📊 Personal & Business Monthly Financial Plan

=== Revenues & Multiplier Income ===
primary_salary = 5.5k
consulting = 1.8k
freelance = 500k tl to usd
side_project = $500
subtotal

=== Fixed Living Expenses ===
rent_mortgage = 1.85k
groceries = 650
utilities = 220
subscriptions = 45
internet = 35 + %20 kdv
car_payment = loan(18k, 6.9%, 4 years)
subtotal

=== Savings & Investments ===
emergency_fund = 15% of primary_salary
crypto_dca = 0.05 btc + $250 to usd
gold_savings = 2 gram gold to usd
subtotal

=== Financial Summary & Runway ===
total_income = L8
total_spending = L17
net_monthly_savings = total_income - total_spending
annual_savings_projected = net_monthly_savings * 12
in_20_years = compound(annual_savings_projected, 7%, 20 years)`

// Earlier versions of the default tabs. A guest tab still holding one of these texts is an
// untouched example, so it isn't uploaded into an account at login (see isUntouchedDefaultTab).
export const LEGACY_DEFAULT_TAB_CONTENTS = [
  `// welcome — this is çetele notepad calculator
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
total`,
  '// 📊 Personal & Business Monthly Financial Plan\n\n=== Revenues & Multiplier Income ===\nprimary_salary = 5.5k\nconsulting = 1.8k\nfreelance = 500k tl to usd\nside_project = $500\nsubtotal\n\n=== Fixed Living Expenses ===\nrent_mortgage = 1.85k\ngroceries = 650\nutilities = 220\nsubscriptions = 45\nsubtotal\n\n=== Savings & Investments ===\nemergency_fund = 15% of primary_salary\ncrypto_dca = 0.05 btc + $250\ngold_savings = 2 gram gold to tl\nsubtotal\n\n=== Financial Summary & Runway ===\ntotal_income = L8\ntotal_spending = L15\nnet_monthly_savings = total_income - total_spending\nannual_savings_projected = net_monthly_savings * 12'
]

export const RESERVED_KEYWORDS = new Set([
  'to',
  'in',
  'of',
  'off',
  'increase',
  'decrease',
  'until',
  'since',
  'by',
  'prev',
  'total',
  'subtotal',
  'today',
  'now',
  'pi',
  'e',
  'i',
  'tau',
  'phi',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sec',
  'csc',
  'cot',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'sqrt',
  'cbrt',
  'abs',
  'sign',
  'ceil',
  'floor',
  'round',
  'fix',
  'exp',
  'log',
  'log2',
  'log10',
  'ln',
  'pow',
  'factorial',
  'mod',
  'min',
  'max',
  'sum',
  'mean',
  'median',
  'mode',
  'std',
  'var',
  'prod',
  'gcd',
  'lcm',
  'deg',
  'rad',
  'grad',
  'true',
  'false',
  'null',
  'undefined',
  'nan',
  'infinity'
])

// Key for a variable name: case-insensitive, and Turkish İ matches i
// ('İ'.toLowerCase() is 'i' plus a combining dot, which would otherwise differ from 'i').
export function variableKey(name) {
  return String(name)
    .toLowerCase()
    .replace(/\u0307/g, '')
}

// Looks up a key typed by the user on a lookup table, ignoring JavaScript's built-in properties
// (so words like "constructor" or "toString" aren't found on every object)
export function ownValue(table, key) {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined
}

// Empty lookup table without inherited properties, for user-named keys (variables)
export function emptyTable(initial = {}) {
  return Object.assign(Object.create(null), initial)
}

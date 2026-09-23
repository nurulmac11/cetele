import { math } from './math.js'
import { RESERVED_KEYWORDS, variableKey } from './constants.js'
import {
  RATES,
  convertCurrency,
  normalizeCurrency,
  getBaseCurrencyCode,
  getHistoricalRates,
  toDateKey
} from './rates.js'

const UNIT_ALIASES = {
  tbsp: 'tablespoon',
  tbsps: 'tablespoons',
  tblsp: 'tablespoon',
  tblsps: 'tablespoons',
  tsp: 'teaspoon',
  tsps: 'teaspoons',
  hr: 'hour',
  hrs: 'hours',
  min: 'minutes',
  mins: 'minutes',
  // Temperatures (°C / °F: the ° sign is skipped by the lexer)
  c: 'degC',
  celsius: 'degC',
  f: 'degF',
  fahrenheit: 'degF',
  kelvin: 'K',
  // Speeds
  mph: 'mi/h',
  kph: 'km/h',
  kmh: 'km/h'
}

// Functions callable from the notepad. Anything else in mathjs (evaluate, import, createUnit...)
// is deliberately not reachable.
const ALLOWED_FUNCTIONS = new Set([
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
  'variance',
  'prod',
  'gcd',
  'lcm',
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
  'atanh'
])

const FUNCTION_ALIASES = { ln: 'log', avg: 'mean', average: 'mean', var: 'variance' }

// Functions whose result is in the same currency as their arguments
const CURRENCY_PRESERVING_FUNCTIONS = new Set([
  'abs',
  'ceil',
  'floor',
  'round',
  'fix',
  'min',
  'max',
  'sum',
  'mean',
  'median'
])

const MS_PER_DAY = 86400000

// Finance helpers. Rates can be written as 5% or 5; a plain number of 1 or more is read as percent.
function rateOf(arg) {
  if (arg.isPercent) return arg.value
  return arg.value >= 1 ? arg.value / 100 : arg.value
}

// A count of periods, from a number or a time unit (30 years -> 360 months)
function periodsOf(arg, unit) {
  if (arg.isUnit) return arg.value.toNumber(unit)
  return arg.value
}

const FINANCE_FUNCTIONS = {
  // loan(amount, yearly rate, months or "30 years") -> monthly payment
  loan: {
    arity: [3, 3],
    run([principal, rate, term]) {
      const months = Math.round(periodsOf(term, 'months'))
      const r = rateOf(rate) / 12
      if (!(months > 0)) return { error: 'Loan term must be at least 1 month' }
      const payment = r === 0 ? principal.value / months : (principal.value * r) / (1 - Math.pow(1 + r, -months))
      return { value: payment, currency: principal.currency }
    }
  },
  // pmt(rate per period, number of periods, present value) -> payment per period
  pmt: {
    arity: [3, 3],
    run([rate, periods, principal]) {
      const n = periodsOf(periods, 'months')
      const r = rateOf(rate)
      if (!(n > 0)) return { error: 'Number of periods must be positive' }
      const payment = r === 0 ? principal.value / n : (principal.value * r) / (1 - Math.pow(1 + r, -n))
      return { value: payment, currency: principal.currency }
    }
  },
  // compound(amount, yearly rate, years, times compounded per year = 12) -> final amount
  compound: {
    arity: [3, 4],
    run([principal, rate, years, perYear]) {
      const t = periodsOf(years, 'years')
      const k = perYear ? perYear.value : 12
      if (!(k > 0)) return { error: 'Compounding must happen at least once a year' }
      return { value: principal.value * Math.pow(1 + rateOf(rate) / k, k * t), currency: principal.currency }
    }
  }
}

// Error for a conversion without a rate. Inside "@ date" it names the day, and explains that
// rates before 2024-03-02 cover only major currencies.
function missingRateError(ctx, from, to) {
  const codes = [from, to].filter((c) => c && !(ctx.rates || RATES)[getBaseCurrencyCode(c)])
  const label = (codes.length ? codes : [to]).map((c) => DISPLAY_CODES[c] || c).join(' / ')
  if (!ctx.rateDate) return { error: `No exchange rate for ${label}` }
  const hint =
    ctx.rateCoverage === 'major' ? ' (rates before 2024-03-02 cover major currencies only, no gold or crypto)' : ''
  return { error: `No ${label} rate for ${ctx.rateDate}${hint}` }
}

const DISPLAY_CODES = {
  GRAM_GOLD: 'gram gold',
  CEYREK_GOLD: 'çeyrek gold',
  XAU: 'gold (XAU)',
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₺': 'TRY',
  '¥': 'JPY',
  '₹': 'INR'
}

// Records that the line being evaluated reads another line (for highlighting references)
function noteDependency(ctx, lineIdx) {
  if (ctx.deps && lineIdx !== null && lineIdx !== undefined) ctx.deps.add(lineIdx)
}

// Adds months, keeping to the last day of shorter months: Jan 31 + 1 month is Feb 28 (not Mar 3)
function addCalendarMonths(date, months) {
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
}

// Turns mathjs unit errors into messages that say what to change
function unitOperationError(e, op, left, right) {
  const message = e?.message || ''
  const isAddOrSubtract = op === '+' || op === '-'
  if (isAddOrSubtract && left.isUnit !== right.isUnit) {
    const unitSide = left.isUnit ? left.value : right.value
    const unitName = typeof unitSide?.formatUnits === 'function' ? unitSide.formatUnits() : 'a unit'
    return { error: `Can't ${op === '+' ? 'add' : 'subtract'} a plain number and ${unitName}; give the number a unit` }
  }
  if (/Units do not match|dimension/i.test(message)) {
    return {
      error: `Units don't match: ${left.value?.formatUnits?.() || 'number'} and ${right.value?.formatUnits?.() || 'number'}`
    }
  }
  return { error: message || 'Invalid unit operation' }
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Whole calendar months from one timestamp to another (negative when "to" is earlier)
function calendarMonthsBetween(from, to) {
  if (to < from) return -calendarMonthsBetween(to, from)
  const a = new Date(from)
  const b = new Date(to)
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) months--
  return months
}

function normalizeUnit(unit) {
  if (!unit) return unit
  const key = String(unit).toLowerCase()
  return UNIT_ALIASES[key] || unit
}

function isError(res) {
  return res && res.error
}

function isPercentNode(node) {
  return node && (node.type === 'PercentNumber' || node.type === 'Percent')
}

function dateResult(timestamp, isTimeIncluded) {
  return { value: timestamp, isDate: true, isTimeIncluded: Boolean(isTimeIncluded) }
}

// ctx: { scope, varCurrencies, scopeDates, lineResults, lineCurrencies, lineDates,
//        prev, prevCurrency, prevDate, sum, sumCurrency, options }
// Variable names in scope, varCurrencies and scopeDates are stored lowercase.
export function evaluateAST(node, ctx) {
  if (!node) return { value: null, currency: null }
  const evaluate = (child) => evaluateAST(child, ctx)

  switch (node.type) {
    case 'Error':
      return { error: node.message || 'Syntax error' }

    case 'Number':
      return { value: node.value, currency: null }

    case 'CurrencyNumber':
      return { value: node.amount, currency: node.currency }

    case 'UnitNumber': {
      try {
        return { value: math.unit(node.amount, normalizeUnit(node.unit)), isUnit: true }
      } catch (e) {
        return { error: e.message || 'Invalid unit' }
      }
    }

    case 'PercentNumber':
      return { value: node.amount / 100, isPercent: true, currency: null }

    case 'Percent': {
      const sub = evaluate(node.expr)
      if (isError(sub)) return sub
      if (typeof sub.value !== 'number') return { error: 'Percent needs a number' }
      return { value: sub.value / 100, isPercent: true, currency: null }
    }

    case 'DateExpression': {
      const baseName = node.baseName ? variableKey(node.baseName) : null
      let baseTime
      let isTimeIncluded = false

      if (node.baseTimestamp !== undefined) {
        baseTime = node.baseTimestamp
      } else if (baseName === 'today') {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        baseTime = d.getTime()
      } else if (baseName === 'now') {
        baseTime = Date.now()
        isTimeIncluded = true
      } else if (baseName === 'prev' && ctx.prevDate) {
        noteDependency(ctx, ctx.prevLine)
        baseTime = ctx.prev
        isTimeIncluded = ctx.prevDate.isTime
      } else if (ctx.scopeDates[baseName]) {
        noteDependency(ctx, ctx.varLines?.[baseName])
        baseTime = ctx.scopeDates[baseName].timestamp
        isTimeIncluded = ctx.scopeDates[baseName].isTime
      } else {
        return { error: `Unknown date variable: ${node.baseName}` }
      }

      let currentTimestamp = baseTime
      for (const offset of node.offsets || []) {
        const sign = offset.op === '+' ? 1 : -1
        const amount = offset.amount * sign
        const unit = offset.unit.toLowerCase()
        const d = new Date(currentTimestamp)

        if (unit.startsWith('day')) d.setDate(d.getDate() + amount)
        else if (unit.startsWith('week')) d.setDate(d.getDate() + amount * 7)
        else if (unit.startsWith('month')) addCalendarMonths(d, amount)
        else if (unit.startsWith('year')) addCalendarMonths(d, amount * 12)
        else if (unit.startsWith('hour')) {
          d.setHours(d.getHours() + amount)
          isTimeIncluded = true
        } else if (unit.startsWith('min')) {
          d.setMinutes(d.getMinutes() + amount)
          isTimeIncluded = true
        }

        currentTimestamp = d.getTime()
      }

      return dateResult(currentTimestamp, isTimeIncluded)
    }

    case 'DateSpan': {
      const target = evaluate(node.target)
      if (isError(target)) return target
      if (!target.isDate) return { error: `"${node.unit} ${node.direction}" needs a date` }
      const unit = node.unit.toLowerCase()
      const usesTime = target.isTimeIncluded || unit.startsWith('hour') || unit.startsWith('min')
      const now = usesTime ? Date.now() : startOfToday()
      const [from, to] = node.direction === 'until' ? [now, target.value] : [target.value, now]

      let amount
      let unitName
      if (unit.startsWith('month')) {
        amount = calendarMonthsBetween(from, to)
        unitName = 'months'
      } else if (unit.startsWith('year')) {
        amount = Math.trunc(calendarMonthsBetween(from, to) / 12)
        unitName = 'years'
      } else if (unit.startsWith('week')) {
        amount = Math.round((to - from) / MS_PER_DAY) / 7
        unitName = 'weeks'
      } else if (unit.startsWith('hour')) {
        amount = (to - from) / 3600000
        unitName = 'hours'
      } else if (unit.startsWith('min')) {
        amount = Math.round((to - from) / 60000)
        unitName = 'minutes'
      } else {
        amount = (to - from) / MS_PER_DAY
        if (!usesTime) amount = Math.round(amount)
        unitName = 'days'
      }
      return { value: math.unit(amount, unitName), isUnit: true }
    }

    case 'AtDate': {
      const historical = getHistoricalRates(node.timestamp)
      if (historical.loading)
        return { pending: true, error: `Loading exchange rates for ${toDateKey(node.timestamp)}…` }
      if (historical.error) return { error: historical.error }

      const requested = toDateKey(node.timestamp)
      const result = evaluateAST(node.expr, {
        ...ctx,
        rates: historical.rates,
        rateDate: requested,
        rateCoverage: historical.coverage
      })
      // Markets were closed that day (weekend, holiday): say which day's rates were used
      if (!isError(result) && historical.effectiveDate && historical.effectiveDate !== requested) {
        return { ...result, note: `Rates from ${historical.effectiveDate}, the last business day before ${requested}` }
      }
      return result
    }

    case 'LineRef': {
      const idx = node.refIdx - 1
      const val = ctx.lineResults[idx]
      if (idx < 0 || idx >= ctx.lineResults.length || val === null || val === undefined) {
        return { error: 'Invalid line reference' }
      }
      noteDependency(ctx, idx)
      const lineDate = ctx.lineDates[idx]
      if (lineDate) return dateResult(val, lineDate.isTime)
      return { value: val, currency: ctx.lineCurrencies[idx] || null, isUnit: !!val?.isUnit }
    }

    case 'Identifier': {
      const name = variableKey(node.name)
      if (name === 'prev') {
        noteDependency(ctx, ctx.prevLine)
        if (ctx.prevDate) return dateResult(ctx.prev, ctx.prevDate.isTime)
        return { value: ctx.prev || 0, currency: ctx.prevCurrency || null, isUnit: !!ctx.prev?.isUnit }
      }
      if (name === 'total') return { value: ctx.sum || 0, currency: ctx.sumCurrency || null }
      if (ctx.scope[name] !== undefined) {
        noteDependency(ctx, ctx.varLines?.[name])
        const value = ctx.scope[name]
        return { value, currency: ctx.varCurrencies[name] || null, isUnit: !!value?.isUnit }
      }
      if (ctx.scopeDates[name]) {
        noteDependency(ctx, ctx.varLines?.[name])
        return dateResult(ctx.scopeDates[name].timestamp, ctx.scopeDates[name].isTime)
      }
      if (RESERVED_KEYWORDS.has(name) || typeof math[name] === 'function') {
        return { value: null, currency: null }
      }
      return { error: `Unknown identifier: ${node.name}` }
    }

    case 'Assignment': {
      const sub = evaluate(node.expr)
      if (isError(sub)) return sub
      return { ...sub, varName: node.varName }
    }

    case 'Conversion': {
      const sub = evaluate(node.expr)
      if (isError(sub)) return sub
      const target = normalizeUnit(node.targetUnit)
      if (!target) return { error: 'Missing conversion target' }
      if (sub.isDate) return { error: 'Dates cannot be converted' }

      if (sub.isUnit) {
        try {
          return { value: sub.value.to(target), isUnit: true }
        } catch (e) {
          return { error: `Cannot convert to ${node.targetUnit}` }
        }
      }

      const targetCurrency = normalizeCurrency(target)
      if (targetCurrency && typeof sub.value === 'number') {
        // A plain number is labelled with the currency (100 to usd)
        if (!sub.currency) return { value: sub.value, currency: targetCurrency }
        const converted = convertCurrency(sub.value, sub.currency, targetCurrency, ctx.rates || RATES)
        if (converted === null) return missingRateError(ctx, sub.currency, targetCurrency)
        return { value: converted, currency: targetCurrency }
      }

      return { error: `Cannot convert to ${node.targetUnit}` }
    }

    case 'Unary': {
      const sub = evaluate(node.expr)
      if (isError(sub)) return sub
      if (sub.isDate) return { error: 'Invalid date operation' }
      if (sub.isUnit) {
        try {
          const val = node.op === '-' ? math.unaryMinus(sub.value) : sub.value
          return { value: val, isUnit: true }
        } catch (e) {
          return { error: e.message || 'Invalid unit operation' }
        }
      }
      const val = node.op === '-' ? -sub.value : sub.value
      return { value: val, currency: sub.currency }
    }

    case 'Binary': {
      const left = evaluate(node.left)
      if (isError(left)) return left

      // a + 10% / a - 10%: change a by a percentage of itself
      if ((node.op === '+' || node.op === '-') && isPercentNode(node.right) && !left.isDate) {
        const pct = evaluate(node.right)
        if (isError(pct)) return pct
        const lVal = left.value ?? 0
        if (left.isUnit) {
          try {
            const factor = node.op === '+' ? 1 + pct.value : 1 - pct.value
            return { value: math.multiply(lVal, factor), isUnit: true }
          } catch (e) {
            return { error: e.message || 'Invalid unit operation' }
          }
        }
        if (typeof lVal === 'number' && isNaN(lVal)) return { value: NaN, currency: left.currency }
        const delta = lVal * pct.value
        return { value: node.op === '+' ? lVal + delta : lVal - delta, currency: left.currency }
      }

      const right = evaluate(node.right)
      if (isError(right)) return right

      if (left.isDate || right.isDate) {
        // date - date gives the time between them
        if (node.op === '-' && left.isDate && right.isDate) {
          let days = (left.value - right.value) / MS_PER_DAY
          // Whole days between calendar dates, even across daylight-saving changes
          if (!left.isTimeIncluded && !right.isTimeIncluded) days = Math.round(days)
          return { value: math.unit(days, 'days'), isUnit: true }
        }
        return { error: 'Add or subtract dates with units, e.g. + 3 days' }
      }

      let lVal = left.value ?? 0
      let rVal = right.value ?? 0

      if (left.isUnit || right.isUnit) {
        // '5 m + 3 cm': the 'm' was read as million, but here it means metres
        if (!left.isUnit && node.left?.metresAmount != null) lVal = math.unit(node.left.metresAmount, 'm')
        if (!right.isUnit && node.right?.metresAmount != null) rVal = math.unit(node.right.metresAmount, 'm')
        try {
          let unitResult
          switch (node.op) {
            case '+':
              unitResult = math.add(lVal, rVal)
              break
            case '-':
              unitResult = math.subtract(lVal, rVal)
              break
            case '*':
              unitResult = math.multiply(lVal, rVal)
              break
            case '/':
              unitResult = math.divide(lVal, rVal)
              break
            case '^':
              unitResult = math.pow(lVal, rVal)
              break
            default:
              return { error: 'Unsupported unit operation' }
          }
          return unitResult?.isUnit ? { value: unitResult, isUnit: true } : { value: unitResult, currency: null }
        } catch (e) {
          // Use the values actually combined: a number may have been turned into metres above
          return unitOperationError(
            e,
            node.op,
            { value: lVal, isUnit: !!lVal?.isUnit },
            { value: rVal, isUnit: !!rVal?.isUnit }
          )
        }
      }

      if ((typeof lVal === 'number' && isNaN(lVal)) || (typeof rVal === 'number' && isNaN(rVal))) {
        return { value: NaN, currency: left.currency || right.currency || null }
      }

      let currency = left.currency || right.currency || null
      if (left.currency && right.currency) {
        const converted = convertCurrency(rVal, right.currency, left.currency, ctx.rates || RATES)
        // Adding amounts in different currencies without a rate would give a meaningless number
        if (converted === null) return missingRateError(ctx, right.currency, left.currency)
        rVal = converted
        // Money divided by money is a plain ratio (10 usd / 2 usd = 5)
        currency = node.op === '/' ? null : left.currency
      }

      let resVal = 0
      switch (node.op) {
        case '+':
          resVal = lVal + rVal
          break
        case '-':
          resVal = lVal - rVal
          break
        case '*':
          resVal = lVal * rVal
          break
        case '/':
          resVal = rVal !== 0 ? lVal / rVal : NaN
          break
        case '^':
          resVal = Math.pow(lVal, rVal)
          break
        case '%':
          resVal = lVal % rVal
          break
      }
      return { value: resVal, currency }
    }

    case 'PercentageOf': {
      const p = evaluate(node.percentExpr)
      const b = evaluate(node.baseExpr)
      if (isError(p)) return p
      if (isError(b)) return b
      if (p.isDate || b.isDate) return { error: 'Invalid date operation' }
      const percentRatio = p.isPercent ? p.value : p.value / 100
      const resVal = node.kind === 'off' ? b.value * (1 - percentRatio) : b.value * percentRatio
      return { value: resVal, currency: b.currency }
    }

    case 'PercentChange': {
      const b = evaluate(node.baseExpr)
      const p = evaluate(node.percentExpr)
      if (isError(b)) return b
      if (isError(p)) return p
      if (p.isDate || b.isDate) return { error: 'Invalid date operation' }
      const percentRatio = p.isPercent ? p.value : p.value / 100
      const factor = node.verb === 'increase' ? 1 + percentRatio : 1 - percentRatio
      return { value: b.value * factor, currency: b.currency }
    }

    case 'Paren':
      return evaluate(node.expr)

    case 'FunctionCall': {
      const lower = node.name.toLowerCase()

      const finance = FINANCE_FUNCTIONS[lower]
      if (finance) {
        const [min, max] = finance.arity
        if (node.args.length < min || node.args.length > max) {
          return { error: `${lower}() takes ${min === max ? min : `${min}–${max}`} values` }
        }
        const args = node.args.map(evaluate)
        const firstError = args.find(isError)
        if (firstError) return firstError
        if (args.some((a) => a.isDate || (typeof a.value !== 'number' && !a.isUnit))) {
          return { error: `${lower}() needs numbers` }
        }
        return finance.run(args)
      }

      const name = FUNCTION_ALIASES[lower] || lower
      if (!ALLOWED_FUNCTIONS.has(name) || typeof math[name] !== 'function') {
        return { error: `Unknown function: ${node.name}` }
      }

      const args = node.args.map(evaluate)
      const firstError = args.find(isError)
      if (firstError) return firstError
      if (args.some((a) => a.isDate)) return { error: 'Invalid date operation' }

      // Bring every currency argument into the first argument's currency
      const currency = args.find((a) => a.currency)?.currency || null
      const missing = args.find(
        (a) =>
          currency &&
          a.currency &&
          typeof a.value === 'number' &&
          convertCurrency(a.value, a.currency, currency, ctx.rates || RATES) === null
      )
      if (missing) return missingRateError(ctx, missing.currency, currency)
      const values = args.map((a) => {
        if (currency && a.currency && a.currency !== currency && typeof a.value === 'number') {
          return convertCurrency(a.value, a.currency, currency, ctx.rates || RATES)
        }
        return a.value
      })

      try {
        const res = math[name](...values)
        if (res?.isUnit) return { value: res, isUnit: true }
        const numVal = typeof res === 'number' ? res : typeof res?.toNumber === 'function' ? res.toNumber() : NaN
        if (Number.isNaN(numVal)) return { error: 'Result is not a real number' }
        return { value: numVal, currency: CURRENCY_PRESERVING_FUNCTIONS.has(name) ? currency : null }
      } catch (e) {
        return { error: e.message || `Invalid arguments for ${node.name}` }
      }
    }
  }

  return { value: 0, currency: null }
}

import { math } from './math.js'
import { RESERVED_KEYWORDS } from './constants.js'
import { convertCurrency, normalizeCurrency } from './rates.js'

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
  mins: 'minutes'
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
      const baseName = node.baseName.toLowerCase()
      let baseTime
      let isTimeIncluded = false

      if (baseName === 'today') {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        baseTime = d.getTime()
      } else if (baseName === 'now') {
        baseTime = Date.now()
        isTimeIncluded = true
      } else if (baseName === 'prev' && ctx.prevDate) {
        baseTime = ctx.prev
        isTimeIncluded = ctx.prevDate.isTime
      } else if (ctx.scopeDates[baseName]) {
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
        else if (unit.startsWith('month')) d.setMonth(d.getMonth() + amount)
        else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + amount)
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

    case 'LineRef': {
      const idx = node.refIdx - 1
      const val = ctx.lineResults[idx]
      if (idx < 0 || idx >= ctx.lineResults.length || val === null || val === undefined) {
        return { error: 'Invalid line reference' }
      }
      const lineDate = ctx.lineDates[idx]
      if (lineDate) return dateResult(val, lineDate.isTime)
      return { value: val, currency: ctx.lineCurrencies[idx] || null, isUnit: !!val?.isUnit }
    }

    case 'Identifier': {
      const name = node.name.toLowerCase()
      if (name === 'prev') {
        if (ctx.prevDate) return dateResult(ctx.prev, ctx.prevDate.isTime)
        return { value: ctx.prev || 0, currency: ctx.prevCurrency || null, isUnit: !!ctx.prev?.isUnit }
      }
      if (name === 'total') return { value: ctx.sum || 0, currency: ctx.sumCurrency || null }
      if (ctx.scope[name] !== undefined) {
        const value = ctx.scope[name]
        return { value, currency: ctx.varCurrencies[name] || null, isUnit: !!value?.isUnit }
      }
      if (ctx.scopeDates[name]) {
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
        const converted = convertCurrency(sub.value, sub.currency, targetCurrency)
        if (converted === null) return { error: `No exchange rate for ${targetCurrency}` }
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
          return { error: e.message || 'Invalid unit operation' }
        }
      }

      if ((typeof lVal === 'number' && isNaN(lVal)) || (typeof rVal === 'number' && isNaN(rVal))) {
        return { value: NaN, currency: left.currency || right.currency || null }
      }

      let currency = left.currency || right.currency || null
      if (left.currency && right.currency) {
        const converted = convertCurrency(rVal, right.currency, left.currency)
        if (converted !== null) rVal = converted
        currency = left.currency
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
      const values = args.map((a) => {
        if (currency && a.currency && a.currency !== currency && typeof a.value === 'number') {
          const converted = convertCurrency(a.value, a.currency, currency)
          return converted === null ? a.value : converted
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

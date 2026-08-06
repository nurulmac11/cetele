import * as math from 'mathjs'
import { RESERVED_KEYWORDS } from './constants.js'
import { RATES, getBaseCurrencyCode, normalizeCurrency } from './rates.js'

export function evaluateAST(node, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options) {
  if (!node) return { value: null, currency: null }

  switch (node.type) {
    case 'Number':
      return { value: node.value, currency: null }

    case 'CurrencyNumber':
      return { value: node.amount, currency: node.currency }

    case 'PercentNumber':
      return { value: node.amount / 100, currency: null }

    case 'DateExpression': {
      let baseTime = Date.now()
      let isTimeIncluded = node.baseName === 'now'

      if (node.baseName === 'today') {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        baseTime = d.getTime()
      } else if (node.baseName === 'now') {
        baseTime = Date.now()
        isTimeIncluded = true
      } else if (scopeDates && scopeDates[node.baseName]) {
        baseTime = scopeDates[node.baseName].timestamp
        if (scopeDates[node.baseName].isTime) isTimeIncluded = true
      }

      let currentTimestamp = baseTime
      for (const offset of (node.offsets || [])) {
        const sign = offset.op === '+' ? 1 : -1
        const amount = offset.amount * sign
        const unit = offset.unit.toLowerCase()
        const d = new Date(currentTimestamp)

        if (unit.startsWith('day')) d.setDate(d.getDate() + amount)
        else if (unit.startsWith('week')) d.setDate(d.getDate() + amount * 7)
        else if (unit.startsWith('month')) d.setMonth(d.getMonth() + amount)
        else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + amount)
        else if (unit.startsWith('hour')) { d.setHours(d.getHours() + amount); isTimeIncluded = true }
        else if (unit.startsWith('min')) { d.setMinutes(d.getMinutes() + amount); isTimeIncluded = true }

        currentTimestamp = d.getTime()
      }

      return { value: currentTimestamp, isDate: true, isTimeIncluded }
    }

    case 'LineRef': {
      const idx = node.refIdx - 1
      const val = (idx >= 0 && idx < lineResults.length && typeof lineResults[idx] === 'number') ? lineResults[idx] : 0
      const curr = lineCurrencies[idx] || null
      return { value: val, currency: curr }
    }

    case 'Identifier': {
      const name = node.name.toLowerCase()
      if (name === 'prev') return { value: prev || 0, currency: prevCurrency || null }
      if (name === 'total') return { value: sum || 0, currency: null }
      if (scope[node.name] !== undefined) {
        return { value: scope[node.name], currency: varCurrencies[node.name] || null }
      }
      if (scope[name] !== undefined) {
        return { value: scope[name], currency: varCurrencies[name] || null }
      }
      if (RESERVED_KEYWORDS.has(name) || typeof math[name] === 'function') {
        return { value: null, currency: null }
      }
      return { value: 0, currency: null }
    }

    case 'Assignment': {
      const sub = evaluateAST(node.expr, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)
      return { varName: node.varName, value: sub.value, currency: sub.currency, isDate: sub.isDate, isTimeIncluded: sub.isTimeIncluded }
    }

    case 'Conversion': {
      const sub = evaluateAST(node.expr, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)
      const rawTarget = normalizeCurrency(node.targetUnit) || node.targetUnit
      const baseTarget = getBaseCurrencyCode(rawTarget) || rawTarget
      const baseSub = getBaseCurrencyCode(sub.currency) || sub.currency
      let val = sub.value
      if (typeof val === 'number' && baseSub && baseTarget && RATES[baseSub] && RATES[baseTarget]) {
        val = (val / RATES[baseSub]) * RATES[baseTarget]
      }
      return { value: val, currency: rawTarget }
    }

    case 'Unary': {
      const sub = evaluateAST(node.expr, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)
      const val = node.op === '-' ? -sub.value : sub.value
      return { value: val, currency: sub.currency }
    }

    case 'Binary': {
      const left = evaluateAST(node.left, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)

      if ((node.op === '+' || node.op === '-') && node.right && node.right.type === 'PercentNumber') {
        const percentRatio = node.right.amount / 100
        const lVal = left.value || 0
        const delta = lVal * percentRatio
        const resVal = node.op === '+' ? lVal + delta : lVal - delta
        return { value: resVal, currency: left.currency }
      }

      const right = evaluateAST(node.right, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)
      let currency = left.currency || right.currency || null

      let lVal = left.value || 0
      let rVal = right.value || 0

      const baseLeft = getBaseCurrencyCode(left.currency)
      const baseRight = getBaseCurrencyCode(right.currency)
      if (baseLeft && baseRight && baseLeft !== baseRight) {
        if (RATES[baseRight] && RATES[baseLeft]) {
          rVal = (rVal / RATES[baseRight]) * RATES[baseLeft]
        }
        currency = left.currency
      }

      let resVal = 0
      switch (node.op) {
        case '+': resVal = lVal + rVal; break
        case '-': resVal = lVal - rVal; break
        case '*': resVal = lVal * rVal; break
        case '/': resVal = rVal !== 0 ? lVal / rVal : 0; break
        case '^': resVal = Math.pow(lVal, rVal); break
        case '%': resVal = lVal % rVal; break
      }
      return { value: resVal, currency }
    }

    case 'PercentageOf': {
      const p = evaluateAST(node.percentExpr, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)
      const b = evaluateAST(node.baseExpr, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)
      const percentRatio = p.value / (p.value > 1 ? 100 : 1)
      let resVal = 0
      if (node.kind === 'off') {
        resVal = b.value * (1 - percentRatio)
      } else {
        resVal = b.value * percentRatio
      }
      return { value: resVal, currency: b.currency }
    }

    case 'PercentChange': {
      const b = evaluateAST(node.baseExpr, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)
      const p = evaluateAST(node.percentExpr, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)
      const percentRatio = p.value / (p.value > 1 ? 100 : 1)
      const factor = node.verb === 'increase' ? (1 + percentRatio) : (1 - percentRatio)
      return { value: b.value * factor, currency: b.currency }
    }

    case 'Paren':
      return evaluateAST(node.expr, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)

    case 'FunctionCall': {
      const name = node.name.toLowerCase()
      const evaluatedArgs = node.args.map(a => evaluateAST(a, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options).value)
      try {
        const fn = math[name]
        if (typeof fn === 'function') {
          const res = fn(...evaluatedArgs)
          return { value: typeof res === 'number' ? res : 0, currency: null }
        }
      } catch (e) {}
      return { value: 0, currency: null }
    }
  }

  return { value: 0, currency: null }
}

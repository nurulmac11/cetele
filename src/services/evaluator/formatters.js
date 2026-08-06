export function stripCommaSeparators(str) {
  if (!str) return ''
  return str.replace(/\b(\d{1,3})(?:,(\d{3}))+(?!\d)/g, (match) => match.replace(/,/g, ''))
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

export function fmtDate(d) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function fmtDateTime(d) {
  return `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatValue(v, options = {}) {
  const { disableFloat = false } = options
  if (v === null || v === undefined) return ''
  if (v instanceof Date) {
    return v.getHours() === 0 && v.getMinutes() === 0 ? fmtDate(v) : fmtDateTime(v)
  }
  if (typeof v === 'number') {
    if (isNaN(v)) return '—'
    if (!isFinite(v)) return v > 0 ? 'Infinity' : '-Infinity'
    if (disableFloat && Number.isInteger(v)) {
      return v.toLocaleString('en-US')
    }
    const abs = Math.abs(v)
    const dec = (abs % 1 === 0) ? 0 : ((abs * 10) % 1 === 0 ? 1 : (abs >= 1000 ? 0 : 2))
    return v.toLocaleString('en-US', {
      minimumFractionDigits: disableFloat ? 0 : dec,
      maximumFractionDigits: disableFloat ? 0 : 4
    })
  }
  if (typeof v === 'object' && v.isUnit) {
    const val = v.value
    const unitStr = v.formatUnits ? v.formatUnits() : String(v.fixPrefix ? v.fixPrefix() : v)
    return `${formatValue(val, options)} ${unitStr}`
  }
  if (typeof v === 'object' && v.value !== undefined) {
    return formatValue(v.value, options)
  }
  return String(v)
}

export function formatValueWithSymbol(val, symbol, options = {}) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  const isGoldOrCrypto = ['GRAM_GOLD', 'CEYREK_GOLD', 'XAU', 'BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX'].includes(symbol)
  const effectiveOptions = isGoldOrCrypto ? { ...options, disableFloat: false } : options

  let formattedNum = ''
  if (typeof val === 'number') {
    const abs = Math.abs(val)
    if (isGoldOrCrypto) {
      const maxDecimals = ['BTC', 'ETH', 'SOL', 'XAU'].includes(symbol) ? 6 : 2
      formattedNum = val.toLocaleString('en-US', {
        minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
        maximumFractionDigits: maxDecimals
      })
    } else {
      formattedNum = formatValue(val, effectiveOptions)
    }
  } else {
    formattedNum = String(val)
  }

  switch (symbol) {
    case '$': return `$${formattedNum}`
    case '€': return `€${formattedNum}`
    case '£': return `£${formattedNum}`
    case '₺': return `₺${formattedNum}`
    case '¥': return `¥${formattedNum}`
    case '₹': return `₹${formattedNum}`
    case 'TL': case 'TRY': return `${formattedNum} TL`
    case 'GRAM_GOLD': return `${formattedNum} gram gold`
    case 'CEYREK_GOLD': return `${formattedNum} çeyrek gold`
    case 'XAU': return `${formattedNum} oz gold`
    default: return `${formattedNum} ${symbol}`
  }
}

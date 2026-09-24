// Copies text, falling back to a hidden textarea where the Clipboard API is blocked.
// Resolves to true when the text was copied.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    const textInput = document.createElement('textarea')
    textInput.value = text
    document.body.appendChild(textInput)
    textInput.select()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch (err) {}
    document.body.removeChild(textInput)
    return copied
  }
}

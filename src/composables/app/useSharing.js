import { encodeSharePayload, decodeSharePayload } from '../../services/shareService.js'
import { getFormattedCopyAllText } from '../../services/evaluator.js'
import { askConfirm } from '../../services/confirmService.js'
import { throttledSyncTabsToCloud } from '../../services/syncService.js'
import { copyText } from '../../utils/clipboard.js'

/**
 * Share links (in both directions) and "Copy all with results".
 * @param {{ tabsApi: ReturnType<typeof import('./useTabs.js').useTabs>, currentUser: import('vue').Ref,
 *           userProfile: import('vue').Ref, showToast: (message: string) => void }} options
 */
export function useSharing({ tabsApi, currentUser, userProfile, showToast }) {
  async function shareActiveTab() {
    if (!tabsApi.activeTab.value) return
    const shareUrl = await encodeSharePayload(tabsApi.activeTab.value)
    if (!shareUrl) {
      showToast('Could not create a share link')
      return
    }
    const copied = await copyText(shareUrl)
    showToast(copied ? 'Share link copied to clipboard' : 'Could not copy the share link: clipboard access was blocked')
  }

  async function copyAllWithResults() {
    if (!tabsApi.activeTab.value) return
    const text = getFormattedCopyAllText(tabsApi.activeTab.value.content, {
      disableFloat: !userProfile.value.showDecimals
    })
    const copied = await copyText(text)
    showToast(copied ? 'Copied all inputs with results (= result)!' : 'Could not copy: clipboard access was blocked')
  }

  // A share link comes from someone else, so show what it holds and ask before adding it
  async function openSharedDoc(sharedDoc) {
    const title = (sharedDoc.title || 'Shared tab').slice(0, 80)
    const lines = sharedDoc.content.split('\n')
    const preview = lines.slice(0, 6).map((line) => (line.length > 70 ? `${line.slice(0, 70)}…` : line || ' '))
    if (lines.length > 6) preview.push(`… ${lines.length - 6} more lines`)

    const confirmed = await askConfirm({
      title: 'Open shared tab?',
      message: `Someone shared "${title}" (${lines.length} line${lines.length === 1 ? '' : 's'}). It will be added as a new tab${
        currentUser.value ? ' and synced to your account' : ''
      }.`,
      details: preview,
      confirmLabel: 'Open as new tab',
      cancelLabel: 'Ignore'
    })
    if (!confirmed) {
      showToast('Shared tab ignored')
      return
    }

    // Marked as shared, so it can't pass for one of your own tabs
    tabsApi.addTab({ title: `Shared: ${title}`, content: sharedDoc.content, idPrefix: 'tab-shared' })
    await tabsApi.persistTabs()
    if (currentUser.value) {
      throttledSyncTabsToCloud(() => tabsApi.tabs.value, currentUser.value.id)
    }
    showToast(`Opened shared tab "${title}"`)
  }

  // Opens the document in the page's share link, if there is one
  async function openSharedLinkFromUrl() {
    const sharedDoc = await decodeSharePayload()
    if (!sharedDoc) return
    // Remove the document from the address bar either way, so a reload doesn't ask again
    history.replaceState(null, '', window.location.pathname)
    if (sharedDoc.tooLarge) {
      showToast('This share link holds a document over 1 MB, so it was not opened')
    } else {
      await openSharedDoc(sharedDoc)
    }
  }

  return { shareActiveTab, copyAllWithResults, openSharedLinkFromUrl }
}

import { computed, markRaw } from 'vue'
import {
  Plus,
  RotateCcw,
  Copy,
  Share2,
  Bookmark,
  Eraser,
  Hash,
  SunMoon,
  PanelRight,
  Settings,
  BookOpen,
  Library,
  Cloud,
  HelpCircle,
  History
} from '@lucide/vue'

/**
 * Commands listed in the Ctrl/Cmd+K palette. Labels follow the current settings.
 * @param {{ actions: Record<string, () => unknown>, userProfile: import('vue').Ref,
 *           showSidebar: import('vue').Ref<boolean>, showToast: (message: string) => void }} options
 */
export function usePaletteCommands({ actions, userProfile, showSidebar, showToast }) {
  const commands = computed(() =>
    [
      { id: 'new-tab', label: 'New tab', hint: 'Alt+N', icon: Plus, run: actions.createTab },
      {
        id: 'reopen-tab',
        label: 'Reopen closed tab',
        hint: 'Alt+Shift+T',
        keywords: 'restore undo',
        icon: RotateCcw,
        run: () => actions.reopenLastClosedTab() || showToast('No closed tabs to reopen')
      },
      { id: 'copy-all', label: 'Copy all lines with results', hint: 'Ctrl+Shift+C', icon: Copy, run: actions.copyAll },
      { id: 'share', label: 'Copy share link for this tab', keywords: 'url', icon: Share2, run: actions.share },
      { id: 'save', label: 'Save tab to library', icon: Bookmark, run: actions.saveToLibrary },
      {
        id: 'history',
        label: 'Version history of this tab',
        keywords: 'versions restore undo backup',
        icon: History,
        run: actions.openHistory
      },
      { id: 'clear', label: 'Clear this tab', keywords: 'delete empty', icon: Eraser, run: actions.clearTab },
      {
        id: 'decimals',
        label: userProfile.value.showDecimals ? 'Hide decimals' : 'Show decimals',
        hint: 'Alt+D',
        keywords: 'decimals round integers',
        icon: Hash,
        run: actions.toggleDecimals
      },
      {
        id: 'theme',
        label: userProfile.value.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        keywords: 'dark light mode',
        icon: SunMoon,
        run: actions.toggleTheme
      },
      {
        id: 'sidebar',
        label: showSidebar.value ? 'Hide sidebar' : 'Show sidebar',
        hint: 'Ctrl+B',
        keywords: 'reference expand',
        icon: PanelRight,
        run: actions.toggleSidebar
      },
      {
        id: 'settings',
        label: 'Open settings',
        hint: 'Ctrl+,',
        keywords: 'import export backup',
        icon: Settings,
        run: actions.openSettings
      },
      { id: 'guide', label: 'Open syntax guide', keywords: 'help docs', icon: BookOpen, run: actions.openGuide },
      { id: 'library', label: 'Open saved library', keywords: 'saved', icon: Library, run: actions.openLibrary },
      { id: 'account', label: 'Cloud sync & account', keywords: 'login sign', icon: Cloud, run: actions.openAccount },
      { id: 'tour', label: 'Quick tour', keywords: 'welcome intro', icon: HelpCircle, run: actions.openTour }
    ].map((command) => ({ ...command, icon: markRaw(command.icon) }))
  )

  function runCommand(id) {
    commands.value.find((c) => c.id === id)?.run()
  }

  return { paletteCommands: commands, runPaletteCommand: runCommand }
}

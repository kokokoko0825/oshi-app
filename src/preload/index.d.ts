import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      setWindowSize: (width: number, height: number) => void
    }
  }
}

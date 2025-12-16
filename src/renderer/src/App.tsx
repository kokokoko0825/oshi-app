import { useState, useEffect, useMemo } from 'react'

// pictureフォルダ内のすべてのPNG画像を動的に読み込む
const imageModules = import.meta.glob<{ default: string }>('./picture/*.PNG', { eager: true })

function App(): React.JSX.Element {
  // 画像をファイル名でソートして配列に変換
  const images = useMemo(() => {
    return Object.entries(imageModules)
      .map(([path, module]) => ({
        path,
        url: module.default,
        filename: path.split('/').pop() ?? ''
      }))
      .sort((a, b) => {
        // ファイル名で自然順ソート（yane_v1, yane_v2, ..., yane_v10の順）
        return a.filename.localeCompare(b.filename, undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      })
      .map((item) => item.url)
  }, [])

  // 初期値は中央付近の画像（存在する場合）
  const [currentIndex, setCurrentIndex] = useState(() => {
    return Math.floor(images.length / 2)
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft') {
        setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1))
      } else if (event.key === 'ArrowRight') {
        setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [images.length])

  if (images.length === 0) {
    return (
      <div className="oshi-container">
        <p>画像が見つかりません</p>
      </div>
    )
  }

  return (
    <div className="oshi-container">
      <img src={images[currentIndex]} width={200} alt="推し" className="oshi-image" />
    </div>
  )
}

export default App

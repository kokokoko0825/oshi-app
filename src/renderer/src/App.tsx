import oshiImg from './assets/yane_v5.PNG' // src/renderer/src/assets/ に画像を置いてください

function App(): React.JSX.Element {
  return (
    <div className="oshi-container">
      <img src={oshiImg} width={200} alt="推し" className="oshi-image" />
    </div>
  )
}

export default App

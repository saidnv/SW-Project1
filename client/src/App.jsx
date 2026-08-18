import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FinanzasApp from './finanzas/FinanzasApp'
import EmitterPage from './pages/EmitterPage'
import HomePage from './pages/HomePage'
import ReceiverPage from './pages/ReceiverPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/compartir" element={<EmitterPage />} />
        <Route path="/stream/:id" element={<ReceiverPage />} />
        <Route path="/finanzas/*" element={<FinanzasApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

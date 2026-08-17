import { Route, Routes } from 'react-router-dom'
import FinanzasProvider from './context/FinanzasProvider'
import ThemeProvider from './context/ThemeProvider'
import ThemeTransition from './components/ThemeTransition'
import FinanzasLayout from './FinanzasLayout'
import AhorrosPage from './pages/AhorrosPage'
import AjustesPage from './pages/AjustesPage'
import CreditosPage from './pages/CreditosPage'
import DeudasPage from './pages/DeudasPage'
import IngresosPage from './pages/IngresosPage'
import PagosPage from './pages/PagosPage'
import ResumenPage from './pages/ResumenPage'

export default function FinanzasApp() {
  return (
    <ThemeProvider>
      <FinanzasProvider>
        <ThemeTransition />
        <Routes>
          <Route path="/" element={<FinanzasLayout />}>
            <Route index element={<ResumenPage />} />
            <Route path="creditos" element={<CreditosPage />} />
            <Route path="deudas" element={<DeudasPage />} />
            <Route path="pagos" element={<PagosPage />} />
            <Route path="ingresos" element={<IngresosPage />} />
            <Route path="ahorros" element={<AhorrosPage />} />
            <Route path="ajustes" element={<AjustesPage />} />
          </Route>
        </Routes>
      </FinanzasProvider>
    </ThemeProvider>
  )
}

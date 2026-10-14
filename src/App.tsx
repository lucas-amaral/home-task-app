import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Nav } from './components/Layout'
import { BoardPage }   from './pages/BoardPage'
import { WeekPage }    from './pages/WeekPage'
import { HistoryPage } from './pages/HistoryPage'
import { AdminPage }   from './pages/AdminPage'
import { WakingNotice } from './components/WakingNotice'

export default function App() {
  return (
    <BrowserRouter>
      <WakingNotice />
      <Nav />
      <Routes>
        <Route path="/"        element={<BoardPage />} />
        <Route path="/week"    element={<WeekPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/admin"   element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}

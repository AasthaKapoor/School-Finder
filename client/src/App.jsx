import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ShortlistProvider } from './context/ShortlistContext'
import Header from './components/Header'
import Home from './pages/Home'
import SchoolDetail from './pages/SchoolDetail'
import Shortlist from './pages/Shortlist'
import Export from './pages/Export'
import './index.css'

export default function App() {
  return (
    <ShortlistProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/school/:urn" element={<SchoolDetail />} />
          <Route path="/shortlist" element={<Shortlist />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </BrowserRouter>
    </ShortlistProvider>
  )
}

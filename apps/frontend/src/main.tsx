import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/app/styles/index.css'
import App from '@/app/App'
import { ThemeProvider } from '@/app/model/theme'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { TrainDashboardProvider } from '@/entities/train/model/TrainDashboardProvider'
import { TrainSelectionProvider } from '@/pages/live-map/model/trainSelection'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <TrainDashboardProvider>
          <BrowserRouter>
            <TrainSelectionProvider>
              <App />
            </TrainSelectionProvider>
          </BrowserRouter>
        </TrainDashboardProvider>
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>,
)

import { lazy, Suspense, Component, type ReactNode, type ErrorInfo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { AppLayout } from './layouts/AppLayout'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#ef4444', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', overflowY: 'auto', height: '100%', background: '#0a0a0f' }}>
          <strong style={{ fontSize: 16 }}>render error</strong>{'\n\n'}
          {(this.state.error as Error).message}{'\n\n'}
          {(this.state.error as Error).stack}
        </div>
      )
    }
    return this.props.children
  }
}

const LandingPage = lazy(() => import('./pages/LandingPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const ThreadPage = lazy(() => import('./pages/ThreadPage'))
const CreateThreadPage = lazy(() => import('./pages/CreateThreadPage'))
const DMPage = lazy(() => import('./pages/DMPage'))
const PairPage = lazy(() => import('./pages/PairPage'))
const VenuesPage = lazy(() => import('./pages/VenuesPage'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid var(--color-primary)',
        borderTopColor: 'transparent',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <RootLayout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<AppLayout />}>
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/thread/:id" element={<ThreadPage />} />
              <Route path="/create" element={<CreateThreadPage />} />
              <Route path="/dm/:chatId" element={<DMPage />} />
              <Route path="/pair" element={<PairPage />} />
              <Route path="/venues" element={<VenuesPage />} />
            </Route>
          </Routes>
        </Suspense>
      </RootLayout>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

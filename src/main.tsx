import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } })
// GitHub Pages cannot rewrite nested URLs to index.html.
const Router = import.meta.env.MODE === 'github-pages' ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router><App /></Router>
    </QueryClientProvider>
  </React.StrictMode>,
)

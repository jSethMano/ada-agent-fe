import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChakPage } from '@/routes/chak-page'

// Single page, so no router. Retries are off: a failed agent turn should surface
// to the visitor immediately with a retry they choose, not be silently repeated.
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: false },
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakPage />
    </QueryClientProvider>
  )
}

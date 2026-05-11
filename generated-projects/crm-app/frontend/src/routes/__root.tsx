import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Meta, Scripts } from '@tanstack/start'
import { Providers } from '../providers'
import '../styles/globals.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'icon', href: '/favicon.ico' }],
  }),
  component: RootLayout,
})

function RootLayout() {
  return (
    <html lang="en" className="dark">
      <head>
        <title>my-app</title>
        <meta name="description" content="Generated application" />
        <Meta />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <main className="min-h-screen bg-background">
            <Outlet />
          </main>
        </Providers>
        <Scripts />
      </body>
    </html>
  )
}

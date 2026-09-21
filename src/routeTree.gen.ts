import { Route as RootRoute } from './routes/__root'
import { Route as AccountRoute } from './routes/account'
import { Route as DashboardRoute } from './routes/dashboard'
import { Route as FaqRoute } from './routes/faq'
import { Route as IndexRoute } from './routes/index'
import { Route as LoginRoute } from './routes/login'
import { Route as OrdersRoute } from './routes/orders'
import { Route as ProductsRoute } from './routes/products'
import { Route as RegisterRoute } from './routes/register'
import { Route as TopupRoute } from './routes/topup'

// Keep the file-route path map available to createFileRoute in every route module.
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
    }
    '/account': {
      id: '/account'
      path: '/account'
      fullPath: '/account'
    }
    '/dashboard': {
      id: '/dashboard

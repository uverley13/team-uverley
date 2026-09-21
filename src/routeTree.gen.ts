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

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': { id: '/'; path: '/'; fullPath: '/' }
    '/account': { id: '/account'; path: '/account'; fullPath: '/account' }
    '/dashboard': { id: '/dashboard'; path: '/dashboard'; fullPath: '/dashboard' }
    '/faq': { id: '/faq'; path: '/faq'; fullPath: '/faq' }
    '/login': { id: '/login'; path: '/login'; fullPath: '/login' }
    '/orders': { id: '/orders'; path: '/orders'; fullPath: '/orders' }
    '/products': { id: '/products'; path: '/products'; fullPath: '/products' }
    '/register': { id: '/register'; path: '/register'; fullPath: '/register' }
    '/topup': { id: '/topup'; path: '/topup'; fullPath: '/topup' }
  }
}

export const routeTree = RootRoute.addChildren([
  IndexRoute,
  LoginRoute,
  RegisterRoute,
  AccountRoute,
  DashboardRoute,
  OrdersRoute,
  ProductsRoute,
  TopupRoute,
  FaqRoute,
])

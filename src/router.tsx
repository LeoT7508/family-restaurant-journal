import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/features/AppShell'
import Home from '@/pages/Home'
import QuickLog from '@/pages/QuickLog'
import Journal from '@/pages/Journal'
import VisitDetail from '@/pages/VisitDetail'
import Profile from '@/pages/Profile'
import NotFound from '@/pages/NotFound'
import RestaurantDetail from '@/pages/RestaurantDetail'
import Wine from '@/pages/Wine'
import WhereTonight from '@/pages/WhereTonight'
import Wishlist from '@/pages/Wishlist'
import MapPage from '@/pages/MapPage'
import YearInReviewPage from '@/pages/YearInReview'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'log', element: <QuickLog /> },
      { path: 'log/:visitId', element: <QuickLog /> },
      { path: 'journal', element: <Journal /> },
      { path: 'journal/:visitId', element: <Journal /> },
      { path: 'visits/:visitId', element: <VisitDetail /> },
      { path: 'restaurants/:restaurantId', element: <RestaurantDetail /> },
      { path: 'wine', element: <Wine /> },
      { path: 'wishlist', element: <Wishlist /> },
      { path: 'tonight', element: <WhereTonight /> },
      { path: 'map', element: <MapPage /> },
      { path: 'year', element: <YearInReviewPage /> },
      { path: 'profile', element: <Profile /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)
export const createTestRouter = (initialEntries: string[] = ['/']) =>
  createMemoryRouter(routes, { initialEntries })

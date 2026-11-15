import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RouteErrorBoundary } from "../components/feedback/RouteErrorBoundary.js";
import { LoadingState } from "../components/ui/LoadingState.js";
import { ProtectedRoute } from "../features/auth/index.js";

const LandingPage = lazy(() =>
  import("../pages/LandingPage.js").then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() =>
  import("../pages/LoginPage.js").then((m) => ({ default: m.LoginPage })),
);
const AppHomePage = lazy(() =>
  import("../pages/AppHomePage.js").then((m) => ({ default: m.AppHomePage })),
);
const ProfilePage = lazy(() =>
  import("../pages/ProfilePage.js").then((m) => ({ default: m.ProfilePage })),
);
const EmergencyPage = lazy(() =>
  import("../pages/EmergencyPage.js").then((m) => ({ default: m.EmergencyPage })),
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage.js").then((m) => ({ default: m.NotFoundPage })),
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<LoadingState message="Loading Saath..." />}>
        <LandingPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<LoadingState message="Loading sign-in..." />}>
        <LoginPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState message="Loading care hub..." />}>
            <AppHomePage />
          </Suspense>
        ),
      },
      {
        path: "*",
        element: (
          <Suspense fallback={<LoadingState message="Loading..." />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "/p/:profileId",
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState message="Loading care hub..." />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: "*",
        element: (
          <Suspense fallback={<LoadingState message="Loading care hub..." />}>
            <ProfilePage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "/emergency/:token",
    element: (
      <Suspense fallback={<LoadingState message="Loading emergency medical record..." />}>
        <EmergencyPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<LoadingState message="Loading..." />}>
        <NotFoundPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
]);

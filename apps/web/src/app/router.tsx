import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RouteErrorBoundary } from "../components/feedback/RouteErrorBoundary.js";
import { LoadingState } from "../components/ui/LoadingState.js";

const LandingPage = lazy(() =>
  import("../pages/LandingPage.js").then((m) => ({ default: m.LandingPage })),
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
    path: "*",
    element: (
      <Suspense fallback={<LoadingState message="Loading..." />}>
        <NotFoundPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
]);

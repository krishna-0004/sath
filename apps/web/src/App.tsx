import React from "react";
import { RouterProvider } from "react-router-dom";
import { Providers } from "./app/providers.js";
import { router } from "./app/router.js";
import { OfflineBanner } from "./components/feedback/OfflineBanner.js";
import { ServerWakingBanner } from "./components/feedback/ServerWakingBanner.js";

export function App(): React.JSX.Element {
  return (
    <Providers>
      <OfflineBanner />
      <ServerWakingBanner />
      <RouterProvider router={router} />
    </Providers>
  );
}

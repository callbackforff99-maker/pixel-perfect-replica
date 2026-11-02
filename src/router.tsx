import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // The Android APK serves the SPA from Capacitor's local WebView origin.
  // Hash history keeps child-page navigation inside index.html instead of
  // requesting /sleep, /calm, etc. as separate files and getting a 404.
  const history = createHashHistory();

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

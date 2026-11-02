import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Hash history is only available in the browser. During SSR/prerender,
  // let TanStack Start provide its server history to avoid window access.
  const history =
    typeof window !== "undefined" ? createHashHistory() : undefined;

  const router = createRouter({
    routeTree,
    ...(history ? { history } : {}),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

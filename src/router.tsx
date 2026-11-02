import { QueryClient } from "@tanstack/react-query";
import {
  createHashHistory,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Hash history is only available in the browser. During SSR/prerender,
  // use memory history so the build can render pages without window.location.
  const history =
    typeof window !== "undefined"
      ? createHashHistory()
      : createMemoryHistory({ initialEntries: ["/"] });

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

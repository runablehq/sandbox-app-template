/* eslint-disable */
// @ts-nocheck

import { Route as rootRoute } from "./routes/__root"
import { Route as IndexRoute } from "./routes/index"

export const routeTree = rootRoute.addChildren([
  IndexRoute,
])

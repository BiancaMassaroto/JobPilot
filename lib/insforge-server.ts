// Server-side — used in Server Components, Route Handlers, Server Actions, agent code
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  return createServerClient({
    cookies: await cookies(),
  });
};

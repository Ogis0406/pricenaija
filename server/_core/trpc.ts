import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { checkDatabaseAdmin } from "../adminAccess";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });
export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  const status = await checkDatabaseAdmin(ctx.user);
  if (status === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The PriceNaija database is not available yet." });
  if (status !== "allowed") throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  return next({ ctx: { ...ctx, user: ctx.user } });
}));

export const businessProcedure = t.procedure.use(t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || (ctx.user.accountRole !== "business" && ctx.user.accountRole !== "admin")) throw new TRPCError({ code: "FORBIDDEN", message: "A business account is required." });
  return next({ ctx: { ...ctx, user: ctx.user } });
}));

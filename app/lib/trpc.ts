import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Client authentication middleware
export const clientProtected = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.clientToken) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Client authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      client: ctx.clientToken,
    },
  });
});

// Staff authentication middleware
export const staffProtected = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.staffToken) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Staff authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      staff: ctx.staffToken,
    },
  });
});

// Role-based middleware for staff
export const requireStaffRole = (allowedRoles: string[]) => {
  return staffProtected.use(async ({ ctx, next }) => {
    if (!ctx.staffToken || !allowedRoles.includes(ctx.staffToken.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }

    return next();
  });
};

// Manager-only procedures
export const managerOnly = requireStaffRole(['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR']);

// Admin-only procedures
export const adminOnly = requireStaffRole(['SUPER_ADMIN']);

// Expert and above procedures
export const expertAndAbove = requireStaffRole(['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT']);

export { t };
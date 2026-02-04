import { createTRPCRouter } from '../../lib/trpc';
import { clientAuthRouter } from './clientAuth';
import { staffAuthRouter } from './staffAuth';

export const appRouter = createTRPCRouter({
  clientAuth: clientAuthRouter,
  staffAuth: staffAuthRouter,
});

export type AppRouter = typeof appRouter;
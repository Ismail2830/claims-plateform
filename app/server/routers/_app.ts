import { createTRPCRouter } from '../../lib/trpc';
import { clientAuthRouter } from './clientAuth';
import { staffAuthRouter } from './staffAuth';
import { loggingRouter } from './logging';

export const appRouter = createTRPCRouter({
  clientAuth: clientAuthRouter,
  staffAuth: staffAuthRouter,
  logging: loggingRouter,
});

export type AppRouter = typeof appRouter;
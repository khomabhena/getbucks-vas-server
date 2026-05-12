import { z } from 'zod';

export const tokenRequestSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  app: z.enum(['airtime', 'bill-payments']),
  sessionID: z.string().min(1),
  userId: z.string().min(1).optional(),
});

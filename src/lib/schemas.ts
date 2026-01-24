import { z } from "zod";

export const PlannedTaskSchema = z.object({
  title: z.string(),
  date: z.string().describe("YYYY-MM-DD"),
  start_time: z.string().describe("HH:MM 24h, local time"),
  duration_minutes: z.number().int().min(5).max(8 * 60),
  difficulty: z.enum(["simple", "normal", "deep"]),
  notes: z.union([z.string(), z.null()]),
});

export const PlanSchema = z.object({
  tasks: z.array(PlannedTaskSchema),
});

export type Plan = z.infer<typeof PlanSchema>;
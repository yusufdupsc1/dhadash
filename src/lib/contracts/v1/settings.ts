import { z } from "zod";

export const InstitutionProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional().default("Bangladesh"),
  timezone: z.string().default("Asia/Dhaka"),
  currency: z.string().default("BDT"),
});

export const InstitutionSettingsSchema = z.object({
  academicYear: z.string().min(1),
  termsPerYear: z.coerce.number().min(1).max(4).default(3),
  workingDays: z.array(z.number()).default([1, 2, 3, 4, 5]),
  emailNotifs: z.boolean().default(true),
  smsNotifs: z.boolean().default(false),
  lateFeePercent: z.coerce.number().min(0).max(100).default(0),
  gracePeriodDays: z.coerce.number().min(0).max(365).default(7),
  signatoryName: z.string().optional(),
  signatoryTitle: z.string().optional(),
  coSignatoryName: z.string().optional(),
  coSignatoryTitle: z.string().optional(),
  certificateFooter: z.string().optional(),
  certificateLogoUrl: z.string().url().optional().or(z.literal("")),
  publicReportsEnabled: z.boolean().default(false),
  publicReportsDescription: z.string().max(240).optional().or(z.literal("")),
  useBanglaDigits: z.boolean().default(false),
});

export type InstitutionProfileInput = z.infer<typeof InstitutionProfileSchema>;
export type InstitutionSettingsInput = z.infer<typeof InstitutionSettingsSchema>;

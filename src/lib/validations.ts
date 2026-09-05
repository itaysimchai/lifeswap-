import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const hostApplicationSchema = z.object({
  bio: z.string().min(100, "Bio must be at least 100 characters").max(1000),
  experience: z.string().min(50, "Experience must be at least 50 characters").max(2000),
  skills: z.array(z.string()).min(1, "Add at least one skill").max(15),
  linkedin: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
  portfolio: z.string().url("Invalid portfolio URL").optional().or(z.literal("")),
  motivation: z.string().min(100, "Motivation must be at least 100 characters").max(2000),
  cvUrl: z.string().optional(),
});

export const serviceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(30, "Description must be at least 30 characters").max(2000),
  // `category` is validated manually in the form (it's a Select kept in separate
  // state, not a registered RHF field) — keeping it here would silently block submit.
  price: z.number().min(0, "Price can't be negative").max(10000, "Maximum price is $10,000"),
  linkedin: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  isRecurring: z.boolean(),
});

export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  scheduledAt: z.date(),
  notes: z.string().max(500).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(20, "Review must be at least 20 characters").max(2000),
  recommend: z.boolean(),
});

export const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000),
  hostId: z.string().optional(),
  bookingId: z.string().optional(),
  isInquiry: z.boolean().default(false),
});

export const reportSchema = z.object({
  targetType: z.enum(["HOST", "USER", "SERVICE"]),
  targetUserId: z.string().optional(),
  targetServiceId: z.string().optional(),
  reason: z.enum(["SPAM", "FRAUD", "OFFENSIVE_CONTENT", "HARASSMENT", "NO_SHOW", "OTHER"]),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000),
});

export const profileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const hostProfileSchema = z.object({
  bio: z.string().min(50).max(1000),
  headline: z.string().max(150).optional().or(z.literal("")),
  experience: z.string().min(50).max(2000),
  skills: z.array(z.string()).min(1).max(15),
  linkedin: z.string().url().optional().or(z.literal("")),
  portfolio: z.string().url().optional().or(z.literal("")),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type HostApplicationFormData = z.infer<typeof hostApplicationSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
export type AvailabilityFormData = z.infer<typeof availabilitySchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type ReportFormData = z.infer<typeof reportSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type HostProfileFormData = z.infer<typeof hostProfileSchema>;

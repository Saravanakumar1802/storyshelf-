import { z } from "zod";

/**
 * Validation schemas shared by forms (react-hook-form), the mock API, and the
 * persisted-state loaders. The future backend can import these unchanged.
 */

const phoneRe = /^(\+?\d{1,3}[\s-]?)?[6-9]\d{9}$/;

export const nameSchema = z.string().trim().min(2, "Please enter your full name").max(80, "That name is too long");
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => phoneRe.test(v), "Enter a valid 10-digit Indian mobile number");

// ── auth ──
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
    confirm: z.string(),
    terms: z.literal(true, { error: "Please accept the terms to continue" }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
export type SignupInput = z.infer<typeof signupSchema>;

// ── contact ──
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.union([z.literal(""), phoneSchema]).optional(),
  topic: z.enum(["Publishing enquiry", "Existing author", "Library & reading", "Press & partnerships", "Other"]),
  message: z.string().trim().min(20, "Tell us a little more (20+ characters)").max(2000, "Please keep it under 2000 characters"),
});
export type ContactInput = z.input<typeof contactSchema>;

// ── support ticket ──
export const ticketCategories = ["Manuscript & Editing", "Cover & Design", "Distribution", "Royalties & Payments", "Marketing", "Account", "Other"] as const;
export const ticketSchema = z.object({
  subject: z.string().trim().min(6, "Add a short subject (6+ characters)").max(120),
  category: z.enum(ticketCategories),
  priority: z.enum(["low", "normal", "high"]),
  email: emailSchema,
  message: z.string().trim().min(20, "Describe the issue in a little more detail (20+ characters)").max(4000),
  attachments: z.array(z.string()).max(3, "Up to 3 attachments"),
});
export type TicketInput = z.input<typeof ticketSchema>;

export const replySchema = z.object({ body: z.string().trim().min(2, "Write a reply").max(4000) });

// ── publish wizard ──
export const genresList = [
  "Literary Fiction", "Essays", "Poetry", "Historical", "Short Stories", "Romance", "Science Fiction", "Thriller", "Nature", "Fantasy", "Memoir", "Other",
] as const;

export const MAX_MANUSCRIPT_MB = 50;
export const ACCEPTED_MANUSCRIPT = [".pdf", ".doc", ".docx"] as const;

export const publishAuthorSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  city: z.string().trim().min(2, "Enter your city"),
  bio: z.string().trim().max(600, "Keep your bio under 600 characters").optional(),
});

export const publishManuscriptSchema = z.object({
  title: z.string().trim().min(1, "Enter a working title").max(140),
  genre: z.enum(genresList, { error: "Choose a genre" }),
  language: z.string().trim().min(2, "Enter the language"),
  stage: z.enum(["idea", "draft", "final"], { error: "Choose where your manuscript is" }),
  pages: z.coerce.number({ error: "Enter an approximate page count" }).int("Whole pages only").min(24, "Books need at least 24 pages").max(2000, "That's more than 2000 pages — contact us for very long works"),
  fileName: z.string().optional(),
  fileSize: z.number().max(MAX_MANUSCRIPT_MB * 1024 * 1024).optional(),
});

export const publishPlanSchema = z.object({
  plan: z.enum(["kickstart", "levelUp", "pro"], { error: "Choose a plan" }),
  addons: z.array(z.string()),
});

export const publishConsultSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  slot: z.string().min(1, "Choose a time slot"),
  agree: z.literal(true, { error: "Please accept the terms to continue" }),
});

// ── persisted data (validated on load; corrupt data is discarded) ──
export const ticketStoredSchema = z.object({
  id: z.string(),
  subject: z.string(),
  category: z.enum(ticketCategories),
  priority: z.enum(["low", "normal", "high"]),
  status: z.enum(["open", "in-progress", "resolved"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  email: z.string(),
  attachments: z.array(z.string()),
  messages: z.array(
    z.object({ id: z.string(), from: z.enum(["author", "support"]), name: z.string(), body: z.string(), at: z.string() }),
  ),
});

import { z } from 'zod';
import { file } from 'bun';

const StringOrNumber = z.union([z.string(), z.number()]).transform((val) => val.toString());

// Contact schema
export const ContactSchema = z.object({
  type: z.enum(['phone', 'email', 'github', 'linkedin', 'website']),
  value: z.string(),
});
export const WorkExperienceStackItemSchema = z.string().describe('Optimised stack item for the job description.');
export const WorkExperienceStackSchema = z.array(WorkExperienceStackItemSchema);
export const WorkExperienceAchievementSchema = z.string().describe('Optimised achievement for the job description.');
export const WorkExperienceAchievementsSchema = z.array(WorkExperienceAchievementSchema);
// Work experience schema
export const WorkExperienceSchema = z.object({
  company: z.string(),
  description: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  position: z.string(),
  location: z.string().optional().nullable(),
  start: StringOrNumber,
  end: StringOrNumber,
  achievements: WorkExperienceAchievementsSchema,
  stack: WorkExperienceStackSchema.optional().nullable(),
});

// Education schema
export const EducationSchema = z.object({
  title: z.string(),
  school: z.string(),
  location: z.string().optional().nullable(),
  end: StringOrNumber.optional().nullable(),
  description: z.string().optional().nullable(),
});

// Extras schema
export const ExtrasSchema = z.object({
  title: z.string(),
  organization: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start: StringOrNumber.optional().nullable(),
  end: StringOrNumber.optional().nullable(),
  description: z.string().optional().nullable(),
});

export const TitlesSchema = z.array(z.string()).max(3).describe('Optimised titles for the job description.');
export const ProfileSchema = z.string().describe('Optimised profile for the job description.');
// Main CV schema
export const CVSchema = z.object({
  name: z.string(),
  titles: TitlesSchema,
  contacts: z.array(ContactSchema),
  location: z.string(),
  profile: ProfileSchema,
  work: z.array(WorkExperienceSchema),
  education: z.array(EducationSchema),
  extras: z.array(ExtrasSchema).optional().nullable(),
});

// Type exports
export type CV = z.infer<typeof CVSchema>;
export type Titles = z.infer<typeof TitlesSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type WorkExperience = z.infer<typeof WorkExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Extras = z.infer<typeof ExtrasSchema>;

export async function loadCV(path = 'cv.yaml') {
  const content = await file(path).text();
  /** @ts-expect-error (Bun.YAML is not typed yet) */
  const cvRaw = Bun.YAML.parse(content);
  return CVSchema.parse(cvRaw);
}

import { z } from 'zod';
import { ProfileSchema, TitlesSchema, WorkExperienceSchema } from './cv';

export const MatchScoreSchema = z
  .number()
  .min(0)
  .max(100)
  .describe('The match score of the original CV to the job description in percentage from 0 to 100.');

// Base enums and types
export const ImportanceEnum = z.enum(['critical', 'important', 'preferred']);
export const CategoryEnum = z.enum(['technical', 'soft', 'industry', 'certification']);
export const ImpactEnum = z.enum(['high', 'medium', 'low']);
export const CompanySizeEnum = z.enum(['startup', 'small', 'medium', 'large', 'enterprise']);
export const RoleLevelEnum = z.enum(['entry', 'mid', 'senior', 'lead', 'executive']);
export const ToneEnum = z.enum(['professional', 'creative', 'technical', 'executive']);

// Job requirement schema
export const JobRequirementSchema = z.object({
  skill: z.string().min(1),
  importance: ImportanceEnum,
  category: CategoryEnum,
});

// CV section schema
export const CVSectionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.number().int().min(1).max(10),
  keywords: z.array(z.string()).min(0),
});

// Optimization suggestion schema
export const OptimizationSuggestionSchema = z.object({
  section: z.string().min(1),
  originalText: z.string().min(1),
  optimisedText: z.string().min(1),
  reason: z.string().min(1),
  impact: ImpactEnum,
});

// Job analysis response schema
export const JobAnalysisResponseSchema = z.object({
  jobRequirements: z.array(JobRequirementSchema).min(1),
  keySkills: z.array(z.string()).min(1),
  industryContext: z.string().min(1),
  companySize: CompanySizeEnum.optional().nullable(),
  roleLevel: RoleLevelEnum.optional().nullable(),
  preferredTone: ToneEnum.optional().nullable(),
});

// Personal info schema
export const PersonalInfoSchema = z.object({
  name: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  summary: z.string().min(1),
});

// CV sections schema
export const CVSectionsSchema = z.object({
  experience: z.array(CVSectionSchema).min(1),
  skills: z.array(CVSectionSchema).min(1),
  education: z.array(CVSectionSchema).min(1),
  projects: z.array(CVSectionSchema).optional().nullable(),
  certifications: z.array(CVSectionSchema).optional().nullable(),
  additional: z.array(CVSectionSchema).optional().nullable(),
});

// Metadata schema
export const MetadataSchema = z.object({
  totalWords: z.number().int().min(0),
  totalCharacters: z.number().int().min(0),
  keywordDensity: z.record(z.string(), z.number().min(0).max(1)),
  optimizationScore: z.number().min(0).max(100),
});

// Optimised CV content schema
export const OptimisedCVContentSchema = z.object({
  personalInfo: PersonalInfoSchema,
  sections: CVSectionsSchema,
  metadata: MetadataSchema,
});

// CV optimization response schema
export const CVOptimizationResponseSchema = z.object({
  // optimisedContent: OptimisedCVContentSchema,
  // optimizationSuggestions: z.array(OptimizationSuggestionSchema).min(0),
  matchScore: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()).min(0),
  strengthsToHighlight: z.array(z.string()).min(0),
  weaknessesToAddress: z.array(z.string()).min(0),
  tailoredCv: z.object({
    titles: TitlesSchema,
    profile: ProfileSchema,
    work: z.array(WorkExperienceSchema),
  }),
});

// Template info schema for PDF generation
export const TemplateInfoSchema = z.object({
  fonts: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
        weight: z.string().optional().nullable(),
        style: z.string().optional().nullable(),
      })
    )
    .optional()
    .nullable(),
  colors: z
    .object({
      primary: z.string().optional().nullable(),
      secondary: z.string().optional().nullable(),
      text: z.string().optional().nullable(),
      background: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  layout: z
    .object({
      margins: z
        .object({
          top: z.number(),
          right: z.number(),
          bottom: z.number(),
          left: z.number(),
        })
        .optional()
        .nullable(),
      spacing: z.number().optional().nullable(),
      columns: z.number().int().min(1).max(3).optional().nullable(),
    })
    .optional()
    .nullable(),
});

// Type exports - inferred from Zod schemas
export type JobRequirement = z.infer<typeof JobRequirementSchema>;
export type CVSection = z.infer<typeof CVSectionSchema>;
export type OptimizationSuggestion = z.infer<typeof OptimizationSuggestionSchema>;
export type JobAnalysisResponse = z.infer<typeof JobAnalysisResponseSchema>;
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type CVSections = z.infer<typeof CVSectionsSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type OptimisedCVContent = z.infer<typeof OptimisedCVContentSchema>;
export type CVOptimizationResponse = z.infer<typeof CVOptimizationResponseSchema>;
export type TemplateInfo = z.infer<typeof TemplateInfoSchema>;

// Enum type exports
export type Importance = z.infer<typeof ImportanceEnum>;
export type Category = z.infer<typeof CategoryEnum>;
export type Impact = z.infer<typeof ImpactEnum>;
export type CompanySize = z.infer<typeof CompanySizeEnum>;
export type RoleLevel = z.infer<typeof RoleLevelEnum>;
export type Tone = z.infer<typeof ToneEnum>;

// Legacy types for backward compatibility (can be removed once all code is updated)
export type CVAnalysisResult = {
  jobRequirements: JobRequirement[];
  currentSections: CVSection[];
  optimizationSuggestions: OptimizationSuggestion[];
  matchScore: number;
  missingKeywords: string[];
  strengthsToHighlight: string[];
  weaknessesToAddress: string[];
};

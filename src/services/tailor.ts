import z from 'zod';
import { askStructured, createChat } from './ai';
import {
  type CV,
  ProfileSchema,
  TitlesSchema,
  type WorkExperience,
  WorkExperienceAchievementSchema,
  WorkExperienceStackItemSchema,
} from './cv';

export async function seed(
  jd: JD,
  options?: {
    language: string;
    tone: string;
    maxCharacters: number;
  }
) {
  const { language = 'EN_UK', tone = 'Professional' } = options ?? {};

  const systemPrompt = `
You are a CV optimizer. Keep facts honest; do not invent. 
Prefer metrics, action verbs, and ATS-friendly phrasing.

Guidelines:
- Language: ${language}
- Tone: ${tone}
- Preserve the original structure and formatting intent
- Use action verbs and quantifiable achievements
- Incorporate relevant keywords naturally
- Maintain truthfulness - enhance but don't fabricate

The optimisation should:
1. Align content with job requirements
2. Improve keyword relevance
3. Enhance readability and impact
4. Maintain professional authenticity
5. Respect character limits
`;

  const userPrompt = `
Here is the job description that you need to optimise the CV for.

Structured job description:
${jd.structured}
`;
  return createChat({
    systemPrompt,
    userPrompt,
  });
}

const MatchScoreSchema = z
  .number()
  .min(0)
  .max(100)
  .describe('The match score of the original CV to the job description in percentage from 0 to 100.');

const OptimiseTitlesSchema = z.object({
  originalMatchScorePct: MatchScoreSchema.describe(
    'The match score of the original titles to the job description in percentage from 0 to 100.'
  ),
  optimisedMatchScorePct: MatchScoreSchema.describe(
    'The match score of the optimised titles to the job description in percentage from 0 to 100.'
  ),
  optimisedTitles: TitlesSchema,
  gaps: z
    .array(z.string())
    .describe('What is missing from the titles to make them more relevant to the job description.'),
  suggestions: z
    .array(z.string())
    .describe('Any unconfirmed suggestions that would work 100% for ATS parsing but not aligned with original titles.'),
});

export type TailoredTitles = z.infer<typeof OptimiseTitlesSchema>;
export type TailoredTitlesResult = { responseId: string; response: TailoredTitles };

export async function tailorTitles(
  previousResponseId: string,
  cv: CV,
  jd: JD,
  feedback?: string[]
): Promise<TailoredTitlesResult> {
  const systemPrompt = `
You'll be given multiple possible titles for the CV.
Choose the best 3 titles that match the job description.
Optimise the chosen titles to make them more relevant to the job description.
You can modify the titles but only based on profile and work achievements, maintain truthfulness.
Give recommendations for the gaps and unconfirmed suggestions only for the titles, not for the CV as a whole.
Keep language of the profile aligned with the job description language.

Formatting:
- Maximum 3 titles
- Every title length can be maximum 30 characters
- Every title is unique to further joining to a '|' separated string.
- Do not use '—', prefer comma if needed.
- Do not repeat terms across titles.
`;
  return askStructured({
    previousResponseId,
    systemPrompt,
    userPrompt: [
      `The job description analysed:`,
      JSON.stringify(jd.structured),
      `The current original CV:`,
      JSON.stringify(cv),
      `The current titles:`,
      JSON.stringify(cv.titles),
      ...(feedback ? [`The feedback received for the previous response:`, JSON.stringify(feedback)] : []),
    ],
    schema: OptimiseTitlesSchema,
    model: 'gpt-5-mini',
    stream: true,
    progress: 'status',
  });
}

const OptimiseProfileSchema = z.object({
  matchScorePct: MatchScoreSchema.describe(
    'The match score of the original profile to the job description in percentage from 0 to 100.'
  ),
  optimisedProfile: ProfileSchema,
  gaps: z
    .array(z.string())
    .describe('What is missing from the profile to make it more relevant to the job description.'),
  suggestions: z
    .array(z.string())
    .describe(
      'Any unconfirmed suggestions that would work 100% for ATS parsing but not aligned with original profile.'
    ),
  atsPerfectMatch: z
    .string()
    .describe(
      'The profile that would be ATS perfect match for the job description but might not be aligned with original profile.'
    ),
});

export type TailoredProfile = z.infer<typeof OptimiseProfileSchema>;
export type TailoredProfileResult = { responseId: string; response: TailoredProfile };

export async function tailorProfile(
  previousResponseId: string,
  cv: CV,
  jd: JD,
  feedback?: string[]
): Promise<TailoredProfileResult> {
  const systemPrompt = `
You'll be given a profile for the CV, the CV itself and the Job Description.
Optimise the profile of the CV based on the job description.
You can modify the profile but only based on profile and work achievements, maintain truthfulness.
Use the analysed job description to make the profile more relevant to the job description.
Use ATS keywords, tech stack, and key requirements, and key skills to make the profile more relevant to the job description.
Keep language of the profile aligned with the job description language.

Formatting:
- Maximum 700 characters
`;
  return askStructured({
    previousResponseId,
    systemPrompt,
    userPrompt: [
      `The job description analysed:`,
      JSON.stringify(jd.structured),
      `The current original CV:`,
      JSON.stringify(cv),
      `The current profile:`,
      JSON.stringify(cv.profile),
      ...(feedback ? [`The feedback received for the previous response:`, JSON.stringify(feedback)] : []),
    ],
    stream: true,
    progress: 'status',
    schema: OptimiseProfileSchema,
  });
}

const OptimiseWorkExperienceSchema = z.object({
  matchScorePct: MatchScoreSchema.describe(
    'The match score of the work experience to the job description in percentage from 0 to 100.'
  ),
  optimisedAchievements: z.array(
    z.object({
      matchScorePct: MatchScoreSchema.describe(
        'The match score of the achievement to the job description in percentage from 0 to 100.'
      ),
      optimisedAchievement: WorkExperienceAchievementSchema,
    })
  ),
  optimisedStack: z.array(
    z.object({
      matchScorePct: MatchScoreSchema.describe(
        'The match score of the stack item to the job description in percentage from 0 to 100.'
      ),
      optimisedStack: WorkExperienceStackItemSchema,
    })
  ),
});

export type TailoredWorkExperience = z.infer<typeof OptimiseWorkExperienceSchema>;
export type TailoredWorkExperienceResult = { responseId: string; response: TailoredWorkExperience };

export async function tailorWorkExperience(
  previousResponseId: string,
  workExperience: WorkExperience[]
): Promise<TailoredWorkExperienceResult[]> {
  const systemPrompt = `
Optimise the work experience of the CV.

Optimise:
1. Achievements: 150 characters max each
2. Stack: 18 characters max each, one term per item. Example: Wrong: "AWS (CDK, Lambda)", Correct: "AWS", "CDK", "Lambda"
`;
  return Promise.all(
    workExperience.map((work) =>
      askStructured({
        previousResponseId,
        systemPrompt,
        userPrompt: `Current work experience: ${JSON.stringify(work, null, 2)}`,
        schema: OptimiseWorkExperienceSchema,
      })
    )
  );
}

export async function tailorAll(cv: CV, jd: JD) {
  const seedResponseId = await seed(jd);

  const [titles, profile, workExperience] = await Promise.all([
    tailorTitles(seedResponseId, cv, jd),
    tailorProfile(seedResponseId, cv, jd),
    tailorWorkExperience(seedResponseId, cv.work),
  ]);

  return {
    titles,
    profile,
    workExperience,
    createdAt: new Date().toISOString(),
  };
}

export type TailoredCv = {
  titles: TailoredTitles;
  profile: TailoredProfile;
  workExperience: TailoredWorkExperience[];
  createdAt: string;
};

export function merge(originalCv: CV, tailoredCv: TailoredCv): CV {
  const mergedWorkExperience: WorkExperience[] = originalCv.work.map((work, index) => ({
    ...work,
    achievements:
      tailoredCv.workExperience[index]?.optimisedAchievements
        .sort((a, b) => b.matchScorePct - a.matchScorePct)
        .map((achievement) => achievement.optimisedAchievement) ?? [],
    stack:
      tailoredCv.workExperience[index]?.optimisedStack
        .sort((a, b) => b.matchScorePct - a.matchScorePct)
        .map((stack) => stack.optimisedStack) ?? [],
  }));
  return {
    ...originalCv,
    titles: tailoredCv.titles.optimisedTitles,
    profile: tailoredCv.profile.optimisedProfile,
    work: mergedWorkExperience,
  };
}

const JDExctractionSchema = z.object({
  jobTitle: z.string().describe('The title of the job'),
  jobDescription: z.string().describe('The description of the job'),
  techStack: z.array(z.string()).describe('The tech stack of the job'),
  keyRequirements: z.array(z.string()).describe('The key requirements of the job'),
  keySkills: z.array(z.string()).describe('The key skills of the job'),
  industryContext: z.string().describe('The industry context of the job and the company'),
  companyName: z.string().describe('The name of the company'),
  companyCountry: z.string().describe('The country of the company'),
  language: z.enum(['EN_UK', 'EN_US', 'OTHER']).describe('The language of the job description'),
  atsKeywords: z.array(z.string()).describe('The ATS keywords of the job that should be used to optimise the CV.'),
  atsType: z.enum([
    'greenhouse',
    'lever',
    'workable',
    'indeed',
    'ziprecruiter',
    'bamboohr',
    'icims',
    'taleo',
    'adp',
    'smartrecruiters',
    'bullhorn',
    'jazzhr',
    'breezyhr',
    'recruitee',
    'ashby',
    'jobvite',
    'successfactors',
    'hibob',
    'rippling',
    'gusto',
    'other',
  ]),
  customAtsType: z
    .string()
    .describe('If the ATS type is other, please specify the name of the ATS.')
    .optional()
    .nullable(),
  toneNotes: z.string().describe('Any tone notes that should be used to optimise the CV.').optional().nullable(),
});

export type JD = {
  structured: z.infer<typeof JDExctractionSchema>;
  raw: string;
  createdAt: string;
};

export async function jdExtract(jobDescription: string): Promise<JD> {
  const systemPrompt = `
You are an expert at structured data extraction of job descriptions. 
You will be given semi-structured html text from a website representing a job description. 
You will need to extract and convert into given structure. Do not modify the original text.
`;
  const { response } = await askStructured({
    systemPrompt,
    userPrompt: jobDescription,
    schema: JDExctractionSchema,
    stream: true,
    progress: 'raw',
    model: 'gpt-5-nano',
  });
  return {
    structured: response,
    raw: jobDescription,
    createdAt: new Date().toISOString(),
  };
}

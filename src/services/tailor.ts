import z from 'zod';
import { askStructured, createChat } from './ai';
import { type CV, type Profile, ProfileSchema, type Titles, TitlesSchema, type WorkExperience, WorkExperienceAchievementSchema, WorkExperienceStackItemSchema } from './cv';

async function seed(
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
// - Prioritize sections based on job relevance

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

const OptimiseTitlesSchema = z.object({
  relevanceScore: z.number().describe('The relevance score of the original titles to the job description.'),
  optimisedTitles: TitlesSchema,
});

async function optimiseTitles(previousResponseId: string, titles: Titles) {
  const systemPrompt = `
Optimise the titles of the CV.

Formatting:
- Maximum 3 titles
- Every title length can be maximum 30 characters
- Every title is unique to further joining to a '|' separated string.
- Do not use '—', prefer comma if needed.
`;
  return askStructured({
    previousResponseId,
    systemPrompt,
    userPrompt: `Current titles: 
${JSON.stringify(titles, null, 2)}`,
    schema: OptimiseTitlesSchema,
  });
}

const OptimiseProfileSchema = z.object({
  relevanceScore: z.number(),
  optimisedProfile: ProfileSchema,
});

async function optimiseProfile(previousResponseId: string, profile: Profile) {
  const systemPrompt = `
Optimise the profile of the CV.

Formatting:
- Maximum 550 characters
`;
  return askStructured({
    previousResponseId,
    systemPrompt,
    userPrompt: `Current profile: ${profile}`,
    schema: OptimiseProfileSchema,
  });
}

const OptimiseWorkExperienceSchema = z.object({
  relevanceScore: z.number().describe('The relevance score of the work experience to the job description.'),
  optimisedAchievements: z.array(
    z.object({
      relevanceScore: z.number().describe('The relevance score of the achievement to the job description.'),
      optimisedAchievement: WorkExperienceAchievementSchema,
    })
  ),
  optimisedStack: z.array(
    z.object({
      relevanceScore: z.number().describe('The relevance score of the stack item to the job description.'),
      optimisedStack: WorkExperienceStackItemSchema,
    })
  ),
});

async function optimiseWorkExperience(previousResponseId: string, workExperience: WorkExperience[]) {
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

export async function tailor(originalCv: CV, jd: JD) {
  const seedResponseId = await seed(jd);

  const [titles, profile, workExperience] = await Promise.all([
    optimiseTitles(seedResponseId, originalCv.titles),
    optimiseProfile(seedResponseId, originalCv.profile),
    optimiseWorkExperience(seedResponseId, originalCv.work),
  ]);

  return {
    titles,
    profile,
    workExperience,
    createdAt: new Date().toISOString(),
  };
}

export type TailoredCv = Awaited<ReturnType<typeof tailor>>;

export function merge(originalCv: CV, tailoredCv: TailoredCv): CV {
  const mergedWorkExperience: WorkExperience[] = originalCv.work.map((work, index) => ({
    ...work,
    achievements:
      tailoredCv.workExperience[index]?.optimisedAchievements.sort((a, b) => b.relevanceScore - a.relevanceScore).map((achievement) => achievement.optimisedAchievement) ?? [],
    stack: tailoredCv.workExperience[index]?.optimisedStack.sort((a, b) => b.relevanceScore - a.relevanceScore).map((stack) => stack.optimisedStack) ?? [],
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
    'other'
  ]),
  customAtsType: z.string().describe('If the ATS type is other, please specify the name of the ATS.').optional().nullable(),
});

export type JD = {
  structured: z.infer<typeof JDExctractionSchema>;
  raw: string;
  createdAt: string;
};

export async function jdExtract(jobDescription: string): Promise<JD> {
  const response = await askStructured({
    systemPrompt:
      'You are an expert at structured data extraction. You will be given semi-structured html text from a website representing a job description. You will need to extract and convert into given structure. Do not modify the original text.',
    userPrompt: jobDescription,
    schema: JDExctractionSchema,
  });
  return {
    structured: response,
    raw: jobDescription,
    createdAt: new Date().toISOString(),
  };
}

#!/usr/bin/env bun
import { createBrowser } from '@/services/browser';
import { c, formatZodError, intro, l, li, printDiff, repl, success, wip } from '@/services/console';
import { loadCV, type CV } from '@/services/cv';
import { scrapeUrl } from '@/services/scraper';
import { generateInlinedHTML } from '@/services/ssg';
import {
  jdExtract,
  merge,
  seed,
  tailorProfile,
  tailorTitles,
  tailorWorkExperience,
  type JD,
  type TailoredCv,
} from '@/services/tailor';
import { file, write } from 'bun';
import { error as e } from 'console';
import ora from 'ora';
import prompts from 'prompts';
import { parseArgs } from 'util';
import { ZodError } from 'zod';

const tmpDir = './.tmp';

const { values: opts } = parseArgs({
  args: Bun.argv,
  options: {
    cv: {
      type: 'string',
      default: 'cv.yaml',
    },
    visualiseScraping: {
      type: 'boolean',
      default: false,
    },
    jd: {
      type: 'string',
    },
    jdUrl: {
      type: 'string',
    },
    out: {
      type: 'string',
      default: 'cv.pdf',
    },
    generateOnly: {
      type: 'boolean',
    },
  },
  strict: true,
  allowPositionals: true,
});

intro();

const spinner = ora();

/**
 *
 * Load CV
 *
 */
spinner.start('Loading CV');
let cv: CV;
try {
  cv = await loadCV(opts.cv);
} catch (error) {
  if (error instanceof ZodError) {
    e(formatZodError(error));
  } else {
    e(error);
  }
  spinner.fail('CV loading failed');
  process.exit(1);
}
spinner.succeed('CV loaded');

/**
 *
 * Load Job Description
 *
 */
let jd: JD;

if (opts.jd) {
  jd = await file(opts.jd).json();
} else {
  let jdRaw: string | null = null;

  if (opts.jdUrl) {
    spinner.start(`Scraping job description from URL: ${opts.jdUrl}`);
    jdRaw = await scrapeUrl(opts.jdUrl, { visualise: opts.visualiseScraping });
    spinner.succeed('Job description scraped');
  } else {
    const jdType = await prompts({
      type: 'select',
      name: 'jdType',
      message: 'How do you want to enter the job description?',
      choices: [
        { title: 'URL', value: 'url' },
        { title: 'Plain text', value: 'text' },
      ],
    });

    if (jdType.jdType === 'url') {
      const urlAnswers = await prompts({
        type: 'text',
        name: 'url',
        message: 'Enter the job description URL',
      });

      const url = urlAnswers.url;
      spinner.start(`Scraping job description from URL: ${url}`);
      jdRaw = await scrapeUrl(url, { visualise: opts.visualiseScraping });
      spinner.succeed('Job description scraped');
    } else {
      const jdPrompt = await prompts({
        type: 'text',
        name: 'jd',
        message: 'Enter the job description',
      });
      jdRaw = jdPrompt.jd;
    }

    if (!jdRaw) {
      spinner.fail('No job description provided or failed to scrape');
      process.exit(1);
    }
  }

  wip('Extracting job description');
  jd = await jdExtract(jdRaw);
  await write(
    `${tmpDir}/jd-${jd.structured.jobTitle}-at-${jd.structured.companyName}-${jd.createdAt}.json`,
    JSON.stringify(jd, null, 2)
  );
  success('Job description extracted');
}

let tailoredCv: TailoredCv | null = null;
/**
 *
 * Optimize CV
 *
 */
if (!opts.generateOnly) {
  wip('Seeding');
  const seedResponse = await seed(jd);
  success('Seeded');

  wip('Optimizing Titles');
  const titlesReplResult = await repl(
    async ({ prevResult, feedback }) => {
      const prevResponseId = prevResult?.responseId || seedResponse;
      return tailorTitles(prevResponseId, cv, jd, feedback);
    },
    ({ response }) => {
      success('Titles optimised');

      printDiff(
        `Titles: (match: ${response.originalMatchScorePct} → ${response.optimisedMatchScorePct})`,
        cv.titles.join(' | '),
        response.optimisedTitles.join(' | ')
      );

      l(c.bold('Gaps:'));
      response.gaps.forEach((gap) => li(gap));
      l('');
      l(c.bold('Unconfirmed Suggestions:'));
      response.suggestions.forEach((suggestion) => li(suggestion));
      l('');
    }
  );
  if (!titlesReplResult) {
    process.exit(1);
  }
  // await write(`${tmpDir}/optimised-cv-${jd.structured.jobTitle}-at-${jd.structured.companyName}-${jd.createdAt}.json`, JSON.stringify(optimisedResponse, null, 2));

  wip('Optimizing Profile');
  const profileReplResult = await repl(
    async ({ prevResult, feedback }) => {
      const prevResponseId = prevResult?.responseId || seedResponse;
      return await tailorProfile(prevResponseId, cv, jd, feedback);
    },
    (result) => {
      success('Profile optimised');

      printDiff(`Profile: (match: ${result.response.matchScorePct})`, cv.profile, result.response.optimisedProfile);

      l(c.bold('Gaps:'));
      result.response.gaps.forEach((gap) => li(gap));
      l('');
      l(c.bold('Unconfirmed Suggestions:'));
      result.response.suggestions.forEach((suggestion) => li(suggestion));
      l('');
      l(c.bold('ATS Perfect Match:'));
      l(result.response.atsPerfectMatch);
      l('');
    }
  );
  if (!profileReplResult) {
    process.exit(1);
  }

  wip('Optimizing Work Experience');
  const tailoredWorkExperience = await tailorWorkExperience(seedResponse, cv.work);
  success('Work Experience optimised');

  for (let i = 0; i < tailoredWorkExperience.length; i++) {
    const originalWorkExperience = cv.work[i];
    const workExperience = tailoredWorkExperience[i];
    if (!workExperience || !originalWorkExperience) {
      continue;
    }
    printDiff(
      `[${i + 1}] ${originalWorkExperience.company} - ${originalWorkExperience.position} (match: ${workExperience.response.matchScorePct})`,
      originalWorkExperience.achievements.map((achievement) => `- ${achievement}`).join('\n'),
      workExperience.response.optimisedAchievements
        .map((achievement) => `- ${achievement.optimisedAchievement} [${achievement.matchScorePct}]`)
        .join('\n')
    );
    if (originalWorkExperience.stack) {
      printDiff(
        'Stack:',
        originalWorkExperience.stack.map((stack) => `- ${stack}`).join('\n'),
        workExperience.response.optimisedStack
          .map((stack) => `- ${stack.optimisedStack} [${stack.matchScorePct}]`)
          .join('\n')
      );
    }
  }
  const workExperienceConfirmed = await prompts({
    type: 'confirm',
    name: 'workExperienceConfirmed',
    message: 'Please confirm the optimised work experience.',
    initial: true,
  });
  if (!workExperienceConfirmed.workExperienceConfirmed) {
    process.exit(1);
  }

  tailoredCv = {
    titles: titlesReplResult.response,
    profile: profileReplResult.response,
    workExperience: tailoredWorkExperience.map((we) => we.response),
    createdAt: new Date().toISOString(),
  };
}

/**
 *
 * Generate template and save as pdf
 *
 */
spinner.start('Generating template');
const html = await generateInlinedHTML(tailoredCv ? merge(cv, tailoredCv) : cv);
spinner.succeed('Template generated');

spinner.start('Generating PDF');
const browser = await createBrowser({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const pdfOut = opts.out ?? 'cv.pdf';
await page.pdf({
  path: pdfOut,
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' },
});
await browser.close();
spinner.succeed(`Exported ${pdfOut}`);

process.exit(0);

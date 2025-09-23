#!/usr/bin/env bun
import { A4_HEIGHT_PX, A4_WIDTH_PX, createBrowser, getPageInfo } from '@/services/browser';
import { c, formatZodError, intro, l, li, printDiff, repl, success, wip } from '@/services/console';
import { loadCV, type CV } from '@/services/cv';
import { write } from '@/services/io';
import { scrapeUrl } from '@/services/scraper';
import { generateInlinedHTML } from '@/services/ssg';
import {
  jdExtract,
  MAX_SHRINK_ATTEMPTS,
  merge,
  seed,
  shrink,
  tailorProfile,
  tailorTitles,
  tailorWorkExperience,
  type JD,
  type TailoredCv,
} from '@/services/tailor';
import { file } from 'bun';
import { error as e } from 'console';
import ora from 'ora';
import type { Page } from 'playwright';
import prompts from 'prompts';
import { parseArgs } from 'util';
import { ZodError } from 'zod';

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
    },
    generateOnly: {
      type: 'boolean',
    },
    allowMultipage: {
      type: 'boolean',
      default: false,
    },
    acceptAll: {
      type: 'boolean',
      default: false,
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
let cv: CV | null = null;
let jd: JD | null = null;

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

let tailoredCv: TailoredCv | null = null;

if (!opts.generateOnly) {
  /**
   *
   * Load Job Description
   *
   */

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

    wip('Extracting job description (this may take a while)');
    jd = await jdExtract(jdRaw);
    await write(`jd-${jd.structured.jobTitle}-at-${jd.structured.companyName}-${jd.createdAt}`, 'json', jd, true);
    success('Job description extracted');
  }

  /**
   *
   * Optimize CV
   *
   */
  if (!jd) {
    spinner.fail('No job description provided');
    throw new Error('No job description provided');
  }
  wip('Seeding');
  const seedResponse = await seed(jd);
  success('Seeded');

  wip('Optimizing Titles');
  const titlesReplResult = await repl(
    async ({ prevResult, feedback }) => {
      const prevResponseId = prevResult?.responseId || seedResponse;
      return tailorTitles(prevResponseId, cv, jd!, feedback);
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
    },
    opts.acceptAll
  );
  if (!titlesReplResult) {
    process.exit(1);
  }

  wip('Optimizing Profile');
  const profileReplResult = await repl(
    async ({ prevResult, feedback }) => {
      const prevResponseId = prevResult?.responseId || seedResponse;
      return await tailorProfile(prevResponseId, cv, jd!, feedback);
    },
    (result) => {
      success('Profile optimised');

      printDiff(
        `Profile: (match: ${result.response.originalMatchScorePct} → ${result.response.optimisedMatchScorePct})`,
        cv.profile,
        result.response.optimisedProfile
      );

      l(c.bold('Gaps:'));
      result.response.gaps.forEach((gap) => li(gap));
      l('');
      l(c.bold('Unconfirmed Suggestions:'));
      result.response.suggestions.forEach((suggestion) => li(suggestion));
      l('');
      l(c.bold('ATS Perfect Match:'));
      l(result.response.atsPerfectMatch);
      l('');
    },
    opts.acceptAll
  );
  if (!profileReplResult) {
    process.exit(1);
  }

  wip('Optimizing Work Experience');
  const tailoredWorkExperienceReplResult = await repl(
    async ({ prevResult, feedback }) => {
      const prevResponseId = prevResult?.responseId || seedResponse;
      return await tailorWorkExperience(prevResponseId, cv, jd!, feedback);
    },
    (responses) => {
      success('Work Experience optimised');

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const originalWorkExperience = cv.work[i];
        if (!originalWorkExperience || !response) {
          continue;
        }
        l(`[${i + 1}] ${originalWorkExperience.company} - ${originalWorkExperience.position}`);
        printDiff(
          `Work Experience: (match: ${response.response.originalMatchScorePct} → ${response.response.optimisedMatchScorePct})`,
          originalWorkExperience.achievements.map((achievement) => `- ${achievement}`).join('\n'),
          response.response.optimisedAchievements
            .map((achievement) => `- ${achievement.optimisedAchievement} [${achievement.matchScorePct}]`)
            .join('\n')
        );
        printDiff(
          `Stack:`,
          originalWorkExperience.stack?.map((stack) => `- ${stack}`).join('\n') ?? '',
          response.response.optimisedStack
            .map((stack) => `- ${stack.optimisedStack} [${stack.matchScorePct}]`)
            .join('\n')
        );
      }
    },
    opts.acceptAll
  );
  if (!tailoredWorkExperienceReplResult) {
    process.exit(1);
  }

  tailoredCv = {
    titles: titlesReplResult.response,
    profile: profileReplResult.response,
    workExperience: tailoredWorkExperienceReplResult.map((we) => we.response),
    createdAt: new Date().toISOString(),
  };
  await write(
    `optimised-cv-${jd.structured.jobTitle}-at-${jd.structured.companyName}-${jd.createdAt}`,
    'json',
    tailoredCv,
    true
  );
}

/**
 * Merge CV and Tailored CV
 *
 */
const mergedCv = tailoredCv ? merge(cv, tailoredCv) : cv;
const outName =
  opts.out ||
  (!jd
    ? `cv-${cv.name}-${cv.titles[0]}`
    : `cv-${jd.structured.jobTitle}-at-${jd.structured.companyName}-${jd.createdAt}`);
await write(outName, 'yaml', mergedCv);

/**
 *
 * Generate template and save as pdf
 *
 */
let page: Page | null = null;
const browser = await createBrowser();

let cvToExport = mergedCv;
for (let tryCount = 0; tryCount < MAX_SHRINK_ATTEMPTS; tryCount++) {
  cvToExport = shrink(cvToExport, tryCount);
  spinner.start('Generating template');
  const html = await generateInlinedHTML(cvToExport);
  spinner.succeed('Template generated');

  spinner.start('Generating PDF');
  page = await browser.newPage();
  await page.setViewportSize({
    width: A4_WIDTH_PX,
    height: A4_HEIGHT_PX,
  });
  await page.setContent(html, { waitUntil: 'load' });

  // Check if content exceeds one A4 page
  const pageInfo = await getPageInfo(page);

  if (pageInfo.exceedsOnePage) {
    if (opts.allowMultipage) {
      spinner.warn(
        `Warning: CV spans ${pageInfo.numberOfPages} pages (height: ${pageInfo.contentHeight}px, max: ${pageInfo.usableHeight}px)`
      );
      break;
    }
  } else {
    break;
  }
  await page.close();
  spinner.info(
    `CV spans ${pageInfo.numberOfPages} pages, height: ${pageInfo.contentHeight}px, max: ${pageInfo.usableHeight}px. Shrinking CV (attempt ${tryCount + 1})`
  );
}

if (!page || page.isClosed()) {
  spinner.fail('Failed to generate PDF');
  process.exit(1);
}

await page.pdf({
  path: `${outName}.pdf`,
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' },
});
await browser.close();
spinner.succeed(`Exported ${outName}.pdf`);

process.exit(0);

/* eslint-disable @typescript-eslint/no-explicit-any */
import c from 'chalk';
import { log as l } from 'console';
import { ZodError } from 'zod';

export function printDiff(title: string, a: string, b: string) {
  l(c.bold(`\n✨${title}\n`));
  l(c.blue(a));
  l(c.green(b));
  l('\n\n');
}

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  brightRed: '\x1b[91m',
  reset: '\x1b[0m',
};

// Format Zod errors for CLI output with colors
export function formatZodError(error: ZodError, useColors = true): string {
  const issues = error.issues;
  const formattedErrors: string[] = [];

  // Helper to wrap text in color
  const color = (text: string, colorCode: string) => (useColors ? `${colorCode}${text}${colors.reset}` : text);

  formattedErrors.push(color('Validation Failed', colors.red));
  formattedErrors.push(`${color(`${issues.length} error${issues.length > 1 ? 's' : ''} found:`, colors.yellow)}\n`);

  issues.forEach((issue, index) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    const errorNum = `[${index + 1}]`;

    formattedErrors.push(`  ${color(errorNum, colors.red)} ${color(path, colors.cyan)}`);
    formattedErrors.push(`      ${color(issue.message, colors.brightRed)}`);

    // Add additional context based on available properties
    const issueAny = issue as any;

    if ('expected' in issueAny && 'received' in issueAny) {
      formattedErrors.push(`      Expected: ${color(String(issueAny.expected), colors.green)}`);
      formattedErrors.push(`      Received: ${color(String(issueAny.received), colors.red)}`);
    }

    if ('options' in issueAny && Array.isArray(issueAny.options)) {
      formattedErrors.push(`      Allowed values: ${color(issueAny.options.join(', '), colors.green)}`);
    }

    if ('minimum' in issueAny) {
      formattedErrors.push(`      Minimum: ${color(String(issueAny.minimum), colors.green)}`);
    }

    if ('maximum' in issueAny) {
      formattedErrors.push(`      Maximum: ${color(String(issueAny.maximum), colors.green)}`);
    }

    if ('validation' in issueAny) {
      formattedErrors.push(`      Validation: ${color(String(issueAny.validation), colors.green)}`);
    }

    formattedErrors.push(''); // Empty line between errors
  });

  return formattedErrors.join('\n');
}

// Simple version without colors for CI/CD environments
export function formatZodErrorPlain(error: ZodError): string {
  return formatZodError(error, false);
}

// Compact formatter for single-line output
export function formatZodErrorCompact(error: ZodError): string {
  const issues = error.issues;
  const errors = issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });
  return `Validation failed: ${errors.join('; ')}`;
}

// JSON formatter for structured output
export function formatZodErrorJson(error: ZodError): string {
  const formatted = {
    error: 'Validation Failed',
    count: error.issues.length,
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
      ...((issue as any).expected && { expected: (issue as any).expected }),
      ...((issue as any).received && { received: (issue as any).received }),
      ...((issue as any).options && { options: (issue as any).options }),
      ...((issue as any).minimum && { minimum: (issue as any).minimum }),
      ...((issue as any).maximum && { maximum: (issue as any).maximum }),
    })),
  };
  return JSON.stringify(formatted, null, 2);
}

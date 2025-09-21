import TemplateA4 from '@/components/template-a4';
import { renderToStaticMarkup } from 'react-dom/server';
import { type CV } from './cv';

const CSS_IN = './src/index.css';
const CSS_OUT = '.tmp/app.css';
const CSS_PUBLIC_PATH = '/app.css';

export async function generateCSS() {
  const tw = Bun.spawn({
    cmd: ['bunx', '@tailwindcss/cli', '-i', CSS_IN, '-o', CSS_OUT, '--minify'],
    stdout: 'ignore',
    stderr: 'ignore',
  });
  if ((await tw.exited) !== 0) throw new Error('Styles build failed');
  return Bun.file(CSS_OUT);
}

// For normal mode, we inline the CSS
type GenerateHTMLNormalProps = {
  mode: 'normal';
  cv: CV;
  css: string;
};
// For preview mode, we serve the CSS from the server
type GenerateHTMLPreviewProps = {
  mode: 'preview';
  cv: CV;
  css?: never;
};
type GenerateHTMLProps = GenerateHTMLNormalProps | GenerateHTMLPreviewProps;

export async function generateHTML(props: GenerateHTMLProps) {
  const { cv, mode, css } = props;
  const body = renderToStaticMarkup(<TemplateA4 cv={cv} />);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  ${mode === 'preview' ? `<link rel="stylesheet" href="${CSS_PUBLIC_PATH}">` : ''}
  ${mode === 'normal' ? `<style>${css}</style>` : ''}
  <title>CV</title>
</head>
<body>${body} ${mode === 'preview' ? '<!-- preview-only -->' : ''}</body>
</html>`;

  return html;
}

export async function generateInlinedHTML(cv: CV) {
  const css = await (await generateCSS()).text();
  const html = await generateHTML({
    mode: 'normal',
    cv,
    css,
  });
  return html;
}

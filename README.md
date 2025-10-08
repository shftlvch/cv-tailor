# CV Tailor

> A personal CLI tool for managing and tailoring your CV to different opportunities

<p align="center">
  <img src="https://img.shields.io/badge/Built%20with-Bun-black?style=for-the-badge&logo=bun&logoColor=white" alt="Built with Bun">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</p>

## Why I Built This

After spending countless evenings manually tweaking my CV for different roles, I realized I was solving the same problem over and over. Each application meant starting from scratch, trying to remember which experiences to highlight, and inevitably missing important details. I wanted a way to maintain all my experiences in one place and let the computer help me present them in the best light for each opportunity.

This tool is my personal approach to that challenge - it's not about gaming the system or achieving metrics, but about having more time to focus on what matters: finding the right role where I can contribute meaningfully.

## What It Does

CV Tailor is a simple CLI tool that helps you:

1. **Remember Everything** - Keep all your experiences in a structured YAML file
2. **Adapt Thoughtfully** - Use AI to help align your CV with specific job descriptions
3. **Present Cleanly** - Generate consistent, readable PDFs that work with ATS systems

## Features

### AI-Assisted Tailoring

- **Thoughtful Suggestions** - OpenAI helps align your CV language with job descriptions
- **Compatibility Check** - Understand how well your experience matches the role
- **Missing Elements** - Discover what might strengthen your application
- **Your Final Say** - Review and refine all AI suggestions before applying them

### Job Description Understanding

- **Direct Extraction** - Pull job descriptions from company career pages
- **Structured Reading** - AI helps break down what employers are looking for
- **Keyword Recognition** - Find the important terms that ATS systems search for

### Clean Presentation

- **Simple Design** - A minimalistic A4 template that's easy to read
- **Flexible Fitting** - Automatically adjust content to fit one page when needed
- **Extended Format** - Option to use multiple pages for comprehensive roles
- **Live Updates** - See changes instantly while editing

### Developer-Friendly

- **Plain Text Storage** - Your CV lives in a readable YAML file
- **Command Line** - Quick operations without leaving your terminal
- **Fast Processing** - Built with Bun for speed
- **Type Safety** - TypeScript helps catch errors early

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cv-tailor.git
cd cv-tailor

# Install dependencies with Bun
bun install

# Make the CLI executable
chmod +x index.ts
```

## Quick Start

### 1. Create Your Master CV

Create a `cv.yaml` file with all your experience (see `cv-example.yaml` for complete reference):

```yaml
name: George Smiley
# Tailor or Tinker will change 3 most relevant titles and optimise them.
titles:
  - Senior Node.js Developer
  - Legacy Code Investigator
  - Mole Detection Engineer
  # ...

# Only usernames for github and linkedin.
contacts:
  - type: phone
    value: +44 20 7946‑0958
  - type: email
    value: g.smiley@circus-tech.co.uk
  - type: github
    value: beggarman-dev
  - type: linkedin
    value: george-smiley-circus
  # ...

# Your location and availability.
location: London, UK (willing to come out of retirement)

# Your profile that will be optimised based on the job description by Tailor or based on the prompt by Tinker.
profile: >
  Methodical Senior Node.js Developer with 30+ years' experience in deep system analysis and debugging complex 
  distributed architectures. Specialises in identifying security vulnerabilities, memory leaks, and rogue processes 
  in legacy codebases. Known for patient, thorough investigations that uncover hidden bugs others miss. Expert at 
  cleaning up messy code (and glasses) while maintaining operational security. Particularly skilled at finding 
  that one problematic service hiding in your microservices architecture.

# Work Experience, only achievements and stack will be optimised based on the job description by Tailor or based on the prompt by Tinker.
# Hint: Add as many achievements as possible, the more the better, they will be sorted by relevance and shrunk if it exceeds one page when generating the PDF.
work:
  - company: The Circus Technologies Ltd
    description: Intelligence-Grade Software Solutions
    link: https://circus-tech.co.uk
    location: Cambridge Circus, London
    position: Chief Debugging Officer
    start: Jan 2020
    end: present
    achievements:
      - Led "Operation Testify" - identified and removed critical memory leak affecting 5 production services
      - Implemented zero-trust architecture after discovering unauthorised data exfiltration to Moscow servers
      # ...
    stack:
      - Node.js
      - TypeScript
      - Kubernetes
      - Redis (for dead drops)
      # ...
# ...

# Education (this section is copied to the final doc AS IS)
education:
  - title: Computer Science — Bachelor's degree
    school: Oxford University
    location: Oxford, UK
    end: 1991
# ...

# Extras and Skills (this section is copied to the final doc AS IS)
extras:
  - title: Author
    organization: 'Debugging in the Dark: Finding Moles in Your Codebase'
    description: Published guide on identifying problematic code and developers
    start: 2021
    end: present
# ...
```

### 2. Tailor for a Specific Job

```bash
# Interactive mode - provide job URL
bun index.ts

# Direct URL mode
bun index.ts --jdUrl https://careers.company.com/senior-engineer

# Skip AI optimization (just generate PDF)
bun index.ts --skipTailoring

```

### 3. Fine-tune with Custom Prompts

Create a `prompt.md` file:

```markdown
Focus on leadership experience and cloud architecture.
Emphasize DevOps practices and team collaboration.
Use more action verbs and quantifiable achievements.
```

Then run:

```bash
bun index.ts --optimisePrompt prompt.md --skipTailoring
```

## CLI Options

```bash
Options:
  --cv <file>              CV file to load (default: cv.yaml)
  --jdUrl <url>           Job description URL to scrape
  --jd <file>             Pre-extracted job description file
  --out <name>            Output filename (without extension)
  --visualiseScraping     Show browser during scraping
  --allowMultipage        Don't shrink CV to fit one page
  --acceptAll             Auto-accept all AI suggestions
  --skipTailoring         Generate PDF without AI optimization
  --optimisePrompt <file> Apply custom optimization prompt
```

## Typical Workflow

1. **Write Once** - Keep all your experiences in one YAML file
2. **Find & Understand** - Extract what the employer is looking for
3. **Get Suggestions** - Let AI help you highlight relevant experiences
4. **Review & Adjust** - Make sure everything sounds like you
5. **Generate PDF** - Create a clean document ready to send
6. **Review & Repeat** - Use the generated yaml file to fine-tune and generate again

## Preview Mode

For template development and quick iterations:

```bash
# Hot-reload preview server
bun preview.tsx
```

## Architecture

- **CLI** (`index.ts`) - Main entry point and command orchestration
- **Services**
  - `tailor.ts` - AI-powered CV optimization
  - `scraper.ts` - Job description extraction
  - `merger.ts` - Combines original and optimized content
  - `shrinker.ts` - Smart content reduction for single-page fit
  - `tinker.ts` - Custom prompt optimization
- **Components**
  - `template-a4.tsx` - React-based PDF template
  - `typography.tsx` - Consistent text styling
- **AI Integration** - OpenAI GPT for intelligent optimization

## Contributing

Contributions are welcome! Whether it's:

- Bug fixes
- New features
- Documentation improvements
- Template designs
- Localization

Please feel free to submit a Pull Request.

## License

MIT License

---

<p align="center">
  <i>Your experiences matter. This tool just helps you present them better.</i>
</p>

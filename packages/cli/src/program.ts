import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { validateCommand } from './commands/validate.js';
import { renderCommand } from './commands/render.js';
import { sampleDataCommand } from './commands/sample-data.js';
import { CliError } from './utils.js';

export function createProgram(): Command {
  const program = new Command();
  program.name('jsonpdf').description('Generate PDFs from JSON templates').version('0.0.0');

  program
    .command('init')
    .description('Scaffold a new template')
    .argument('<file>', 'Output file path')
    .option('--name <name>', 'Template name', 'Untitled Template')
    .action(initCommand);

  program
    .command('validate')
    .description('Validate a template against the schema')
    .argument('<file>', 'Template JSON file')
    .action(validateCommand);

  program
    .command('render')
    .description('Render a template to PDF')
    .requiredOption('-t, --template <file>', 'Template JSON file')
    .option('-d, --data <file>', 'Data JSON file')
    .option('-o, --output <file>', 'Output PDF file', 'output.pdf')
    .option('-w, --watch', 'Watch for changes and re-render')
    .action(renderCommand);

  program
    .command('sample-data')
    .description('Generate sample data from template dataSchema')
    .argument('<file>', 'Template JSON file')
    .option('-o, --output <file>', 'Output JSON file (default: stdout)')
    .option('--array-length <n>', 'Number of sample array items', '3')
    .action(sampleDataCommand);

  return program;
}

export function run(argv: string[]): void {
  const program = createProgram();
  program.parseAsync(argv).catch((err: unknown) => {
    if (err instanceof CliError) {
      console.error(chalk.red('Error:') + ' ' + err.message);
      process.exit(1);
    }
    console.error(chalk.red('Unexpected error:'));
    console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
    process.exit(2);
  });
}

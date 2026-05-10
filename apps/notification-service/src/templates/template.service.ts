import { Injectable, Logger } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir: string;
  private readonly cache = new Map<string, handlebars.TemplateDelegate>();

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.registerHelpers();
  }

  private registerHelpers(): void {
    handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    handlebars.registerHelper('gt', (a: number, b: number) => a > b);
  }

  render(templateName: string, context: Record<string, unknown>): string {
    try {
      const compiled = this.getCompiledTemplate(templateName);
      return compiled(context);
    } catch (error) {
      this.logger.error(
        `Failed to render template "${templateName}": ${error}`,
      );
      throw error;
    }
  }

  private getCompiledTemplate(name: string): handlebars.TemplateDelegate {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    const filePath = path.join(this.templatesDir, `${name}.hbs`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Template not found: ${filePath}`);
    }

    const source = fs.readFileSync(filePath, 'utf8');
    const compiled = handlebars.compile(source);
    this.cache.set(name, compiled);

    return compiled;
  }
}

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * ParsePositiveIntPipe
 *
 * Usage:
 *   @Query('page', ParsePositiveIntPipe) page: number
 *
 * Parses a string into a positive integer (>= 1).
 * Returns the parsed integer if valid; throws 400 otherwise.
 */
@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  constructor(private readonly options?: { min?: number; max?: number }) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: string, _metadata: ArgumentMetadata): number {
    const parsed = parseInt(value, 10);
    const min = this.options?.min ?? 1;
    const max = this.options?.max ?? Number.MAX_SAFE_INTEGER;

    if (isNaN(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(
        `Value must be an integer between ${min} and ${max}`,
      );
    }

    return parsed;
  }
}

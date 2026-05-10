import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * ParseDatePipe
 *
 * Usage:
 *   @Query('from', ParseDatePipe) from: Date
 *
 * Parses ISO-8601 date strings from query parameters into JS Date objects.
 * Rejects invalid or unparseable strings with a 400.
 */
@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: string, _metadata: ArgumentMetadata): Date {
    if (!value) throw new BadRequestException('Date parameter is required');

    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new BadRequestException(
        `"${value}" is not a valid ISO-8601 date string`,
      );
    }

    return new Date(timestamp);
  }
}

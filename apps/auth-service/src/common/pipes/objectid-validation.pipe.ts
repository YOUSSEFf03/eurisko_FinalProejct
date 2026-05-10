import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * ParseObjectIdPipe
 *
 * Usage:
 *   @Param('id', ParseObjectIdPipe) id: string
 *
 * Validates that a route/query parameter is a valid 24-char hex ObjectId.
 * Returns the string unchanged if valid; throws 400 if not.
 *
 * Why not cast to Types.ObjectId here? Returning a string keeps the
 * controller layer free of Mongoose types and easier to test.
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: string, _metadata: ArgumentMetadata): string {
    if (!value || !Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`"${value}" is not a valid ObjectId`);
    }
    return value;
  }
}

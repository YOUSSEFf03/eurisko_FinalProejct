import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { isValidObjectId, Types } from 'mongoose';

/**
 * Validates a route param is a valid MongoDB ObjectId.
 * Stops garbage from ever reaching the DB layer.
 *
 * @example
 *   @Get(':id')
 *   findOne(@Param('id', ParseObjectIdPipe) id: string) { ... }
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException(
        `Invalid ID${metadata.data ? ` for '${metadata.data}'` : ''}. Expected a valid MongoDB ObjectId.`,
      );
    }
    return new Types.ObjectId(value).toHexString();
  }
}

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Validates a route param is a valid MongoDB ObjectId.
 * Prevents garbage strings from reaching the DB layer.
 *
 * @example
 *   @Get(':id')
 *   findOne(@Param('id', ParseObjectIdPipe) id: string) { ... }
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`"${value}" is not a valid ObjectId`);
    }
    return new Types.ObjectId(value).toHexString();
  }
}

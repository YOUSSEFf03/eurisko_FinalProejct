import { Controller, Get, Param } from '@nestjs/common';
import { Types } from 'mongoose';
import { PositionService } from './position.service';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@Controller('portfolio')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Get()
  getPortfolio(@CurrentUser() user: RequestUser) {
    return this.positionService.getPortfolio(user.userId);
  }

  @Get(':stockId')
  getPosition(
    @CurrentUser() user: RequestUser,
    @Param('stockId', ParseObjectIdPipe) stockId: Types.ObjectId,
  ) {
    return this.positionService.getPosition(user.userId, stockId);
  }
}

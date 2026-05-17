import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { OrderService } from './order.service';
import { PlaceOrderDto, OrderHistoryQueryDto } from './dto/order.dto';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('buy')
  @HttpCode(HttpStatus.CREATED)
  buy(@CurrentUser() user: RequestUser, @Body() dto: PlaceOrderDto) {
    return this.orderService.buy(user.userId, dto);
  }

  @Post('sell')
  @HttpCode(HttpStatus.CREATED)
  sell(@CurrentUser() user: RequestUser, @Body() dto: PlaceOrderDto) {
    return this.orderService.sell(user.userId, dto);
  }

  @Get()
  getHistory(
    @CurrentUser() user: RequestUser,
    @Query() query: OrderHistoryQueryDto,
  ) {
    return this.orderService.getHistory(user.userId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.orderService.findOne(id, user.userId);
  }
}

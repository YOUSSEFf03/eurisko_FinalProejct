import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { StockService } from './stock.service';
import { CreateStockDto, UpdateStockDto, StockQueryDto } from './dto/stock.dto';
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CmsRole } from '../../common/constants';

@Controller('stocks')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ── CMS: Analyst routes ─────────────────────────────────────────────────

  @Post()
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.ANALYST)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStockDto) {
    return this.stockService.create(dto);
  }

  @Patch(':id')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.ANALYST)
  update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateStockDto,
  ) {
    return this.stockService.update(id, dto);
  }

  @Patch(':id/delist')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.ANALYST)
  delist(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.stockService.delist(id);
  }

  // ── Public / Member routes ──────────────────────────────────────────────

  @Get()
  findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.stockService.findById(id);
  }

  @Get(':id/price-history')
  getPriceHistory(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.stockService.getPriceHistory(id, from, to);
  }
}

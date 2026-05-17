import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  VolumeQueryDto,
  TopStocksQueryDto,
  ActiveMembersQueryDto,
} from './dto/analytics.dto';
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CmsRole } from '../../common/constants';

@Controller('analytics')
@UseGuards(CmsJwtAuthGuard, RolesGuard)
@Roles(CmsRole.ADMINISTRATOR, CmsRole.ANALYST)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/volume
   * Trading volume per stock over a configurable time window
   */
  @Get('volume')
  getVolume(@Query() query: VolumeQueryDto) {
    return this.analyticsService.getTradingVolume(query);
  }

  /**
   * GET /analytics/stocks/top
   * Top traded stocks by transaction count — paginated
   */
  @Get('stocks/top')
  getTopStocks(@Query() query: TopStocksQueryDto) {
    return this.analyticsService.getTopStocks(query);
  }

  /**
   * GET /analytics/aum
   * Total platform AUM (positions market value + wallet balances)
   */
  @Get('aum')
  getAum() {
    return this.analyticsService.getAum();
  }

  /**
   * GET /analytics/members/active
   * Most active members by trade count in lookback window
   */
  @Get('members/active')
  getActiveMembers(@Query() query: ActiveMembersQueryDto) {
    return this.analyticsService.getActiveMembers(query);
  }

  /**
   * GET /analytics/sectors
   * Sector allocation breakdown of open positions
   */
  @Get('sectors')
  getSectorAllocation() {
    return this.analyticsService.getSectorAllocation();
  }
}

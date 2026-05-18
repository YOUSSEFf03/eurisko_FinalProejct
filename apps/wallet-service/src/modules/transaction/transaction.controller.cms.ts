import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { TransactionService } from './transaction.service';
import { TransactionHistoryQueryDto } from '../wallet/dto/history-query.dto';
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CmsRole } from '../../common/constants';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

/**
 * CmsTransactionController
 *
 * CMS routes for viewing member transaction histories.
 * Used by Support Agents and Admins in the CMS dashboard.
 *
 *   GET /cms/transactions/:memberId/history
 */
@Controller('cms/transactions')
@UseGuards(CmsJwtAuthGuard, RolesGuard)
@Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT)
export class CmsTransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /**
   * GET /cms/transactions/:memberId/history
   *
   * Returns paginated transaction history for any member.
   * Supports filters: type (deposit|withdrawal|buy|sell|adjustment), from, to, page, limit.
   *
   * Example response:
   * {
   *   items: [{ type, status, amount, createdAt, ... }],
   *   meta: { total, page, limit, totalPages }
   * }
   */
  @Get(':memberId/history')
  getMemberHistory(
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Query() query: TransactionHistoryQueryDto,
  ) {
    return this.transactionService.findHistory({
      userId: memberId,
      type: query.type,
      fromDate: query.from ? new Date(query.from) : undefined,
      toDate: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }
}

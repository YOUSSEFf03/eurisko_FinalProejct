import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { TradingProxyService } from './trading-proxy.service';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// ─── STOCKS ──────────────────────────────────────────────────────────────────

@Controller('stocks')
export class StocksProxyController {
  constructor(private readonly tradingProxy: TradingProxyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createStock(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.tradingProxy.forward('POST', '/stocks', this.user(req), body);
  }

  @Patch(':id')
  updateStock(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.tradingProxy.forward(
      'PATCH',
      `/stocks/${id}`,
      this.user(req),
      body,
    );
  }

  @Patch(':id/delist')
  delistStock(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.tradingProxy.forward(
      'PATCH',
      `/stocks/${id}/delist`,
      this.user(req),
    );
  }

  @Get()
  listStocks(@Req() req: AuthRequest, @Query() query: Record<string, string>) {
    return this.tradingProxy.forward(
      'GET',
      '/stocks',
      this.user(req),
      undefined,
      query,
    );
  }

  @Get(':id')
  getStock(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.tradingProxy.forward('GET', `/stocks/${id}`, this.user(req));
  }

  private user(req: AuthRequest) {
    return {
      userId: req.user?.userId ?? '',
      email: req.user?.email ?? '',
      role: req.user?.role ?? 'member',
    };
  }
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

@Controller('orders')
export class OrdersProxyController {
  constructor(private readonly tradingProxy: TradingProxyService) {}

  @Post('buy')
  @HttpCode(HttpStatus.CREATED)
  placeBuyOrder(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.tradingProxy.forward(
      'POST',
      '/orders/buy',
      this.user(req),
      body,
    );
  }

  @Post('sell')
  @HttpCode(HttpStatus.CREATED)
  placeSellOrder(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.tradingProxy.forward(
      'POST',
      '/orders/sell',
      this.user(req),
      body,
    );
  }

  @Get()
  getOrderHistory(
    @Req() req: AuthRequest,
    @Query() query: Record<string, string>,
  ) {
    return this.tradingProxy.forward(
      'GET',
      '/orders',
      this.user(req),
      undefined,
      query,
    );
  }

  @Get(':id')
  getOrder(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.tradingProxy.forward('GET', `/orders/${id}`, this.user(req));
  }

  private user(req: AuthRequest) {
    return {
      userId: req.user?.userId ?? '',
      email: req.user?.email ?? '',
      role: req.user?.role ?? 'member',
    };
  }
}

// ─── PORTFOLIO ────────────────────────────────────────────────────────────────

@Controller('portfolio')
export class PortfolioProxyController {
  constructor(private readonly tradingProxy: TradingProxyService) {}

  @Get()
  getPortfolio(@Req() req: AuthRequest) {
    return this.tradingProxy.forward('GET', '/portfolio', this.user(req));
  }

  @Get(':stockId')
  getPosition(@Req() req: AuthRequest, @Param('stockId') stockId: string) {
    return this.tradingProxy.forward(
      'GET',
      `/portfolio/${stockId}`,
      this.user(req),
    );
  }

  private user(req: AuthRequest) {
    return {
      userId: req.user?.userId ?? '',
      email: req.user?.email ?? '',
      role: req.user?.role ?? 'member',
    };
  }
}

// ─── ALERTS ──────────────────────────────────────────────────────────────────

@Controller('alerts')
export class AlertsProxyController {
  constructor(private readonly tradingProxy: TradingProxyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createAlert(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.tradingProxy.forward('POST', '/alerts', this.user(req), body);
  }

  @Get()
  getAlerts(@Req() req: AuthRequest) {
    return this.tradingProxy.forward('GET', '/alerts', this.user(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAlert(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.tradingProxy.forward('DELETE', `/alerts/${id}`, this.user(req));
  }

  private user(req: AuthRequest) {
    return {
      userId: req.user?.userId ?? '',
      email: req.user?.email ?? '',
      role: req.user?.role ?? 'member',
    };
  }
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

@Controller('analytics')
export class AnalyticsProxyController {
  constructor(private readonly tradingProxy: TradingProxyService) {}

  @Get('volume')
  getVolume(@Req() req: AuthRequest, @Query() query: Record<string, string>) {
    return this.tradingProxy.forward(
      'GET',
      '/analytics/volume',
      this.user(req),
      undefined,
      query,
    );
  }

  @Get('stocks/top')
  getTopStocks(
    @Req() req: AuthRequest,
    @Query() query: Record<string, string>,
  ) {
    return this.tradingProxy.forward(
      'GET',
      '/analytics/stocks/top',
      this.user(req),
      undefined,
      query,
    );
  }

  @Get('aum')
  getAum(@Req() req: AuthRequest) {
    return this.tradingProxy.forward('GET', '/analytics/aum', this.user(req));
  }

  @Get('members/active')
  getActiveMembers(
    @Req() req: AuthRequest,
    @Query() query: Record<string, string>,
  ) {
    return this.tradingProxy.forward(
      'GET',
      '/analytics/members/active',
      this.user(req),
      undefined,
      query,
    );
  }

  @Get('sectors')
  getSectorAllocation(@Req() req: AuthRequest) {
    return this.tradingProxy.forward(
      'GET',
      '/analytics/sectors',
      this.user(req),
    );
  }

  private user(req: AuthRequest) {
    return {
      userId: req.user?.userId ?? '',
      email: req.user?.email ?? '',
      role: req.user?.role ?? 'member',
    };
  }
  @Get(':id/price-history')
  getPriceHistory(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    return this.tradingProxy.forward(
      'GET',
      `/stocks/${id}/price-history`,
      this.user(req),
      undefined,
      query,
    );
  }
}

import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { CmsAuthService } from '../modules/cms-auth/cms-auth.service';

/**
 * SeedService — runs once on application bootstrap.
 * Seeds Omar (the super admin) if no administrator exists yet.
 *
 * This is idempotent — safe to run on every restart.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly cmsAuthService: CmsAuthService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.cmsAuthService.seedSuperAdmin();
    } catch (err) {
      this.logger.error('Failed to seed super admin', err);
    }
  }
}

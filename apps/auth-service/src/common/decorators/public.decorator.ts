import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
// apps/auth-service/src/common/decorators/public.decorators.ts
export * from './public.decorator';

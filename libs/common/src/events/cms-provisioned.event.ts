export type CmsRole = 'ADMINISTRATOR' | 'ANALYST' | 'SUPPORT_AGENT';

export interface CmsProvisionedEvent {
  userId: string;
  email: string;
  name: string;
  role: CmsRole;
  temporaryPassword: string;
}

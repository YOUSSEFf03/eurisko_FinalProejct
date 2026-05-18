import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CmsRole } from '../../common/constants';

export type CmsUserDocument = HydratedDocument<CmsUser>;

@Schema({ timestamps: true })
export class CmsUser {
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, enum: CmsRole, required: true, index: true })
  role: CmsRole;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @Prop({ type: Boolean, default: true })
  mustChangePassword: boolean;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  createdByUserId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const CmsUserSchema = SchemaFactory.createForClass(CmsUser);

CmsUserSchema.index({ role: 1, createdAt: -1 });

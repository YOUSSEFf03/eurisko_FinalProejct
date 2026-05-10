import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserStatus } from '../../common/constants';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true })
  nationalId: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  suspensionReason?: string;

  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ default: 'none' })
  kycStatus: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

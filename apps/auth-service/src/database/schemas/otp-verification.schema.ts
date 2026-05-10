import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OtpPurpose } from '../../common/constants';

export type OtpVerificationDocument = HydratedDocument<OtpVerification>;

@Schema({ timestamps: true })
export class OtpVerification {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, type: String, enum: OtpPurpose })
  purpose: OtpPurpose;

  @Prop({ default: false })
  used: boolean;

  @Prop({ required: true })
  expiresAt: Date;
}

export const OtpVerificationSchema =
  SchemaFactory.createForClass(OtpVerification);

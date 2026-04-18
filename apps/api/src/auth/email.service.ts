import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const origin = (this.env.WEB_ORIGIN.split(',')[0] ?? this.env.WEB_ORIGIN).trim();
    const link = `${origin}/verify-email?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: this.env.SMTP_FROM,
        to: email,
        subject: 'Verify your Oddzilla email',
        html: `
          <h2>Welcome to Oddzilla</h2>
          <p>Click the link below to verify your email address:</p>
          <p><a href="${link}">${link}</a></p>
          <p>This link expires in 24 hours.</p>
        `,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${email}: ${(err as Error).message}`);
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const origin = (this.env.WEB_ORIGIN.split(',')[0] ?? this.env.WEB_ORIGIN).trim();
    const link = `${origin}/reset-password?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: this.env.SMTP_FROM,
        to: email,
        subject: 'Reset your Oddzilla password',
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password:</p>
          <p><a href="${link}">${link}</a></p>
          <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${email}: ${(err as Error).message}`);
    }
  }
}

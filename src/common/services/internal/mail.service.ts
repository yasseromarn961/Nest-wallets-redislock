import {
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { I18nService } from 'nestjs-i18n';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class MailService {
  private readonly mailerSend: MailerSend;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly frontendUrl: string;

  constructor(
    private configService: ConfigService,
    private readonly i18n: I18nService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    const apiKey = this.configService.get<string>('email.apiKey') || '';
    this.senderEmail =
      this.configService.get<string>('email.senderEmail') || '';
    this.senderName = this.configService.get<string>('email.senderName') || '';
    this.frontendUrl = this.configService.get<string>('frontendUrl') || '';

    this.mailerSend = new MailerSend({
      apiKey,
    });
  }

  async sendEmailVerificationCode(
    email: string,
    code: string,
    language: string = 'en',
  ): Promise<void> {
    const subject =
      language === 'ar'
        ? 'رمز التحقق من البريد الإلكتروني'
        : 'Email Verification Code';

    const htmlBody =
      language === 'ar'
        ? `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333;">رمز التحقق من البريد الإلكتروني</h2>
          <p style="font-size: 16px; color: #555;">مرحباً،</p>
          <p style="font-size: 16px; color: #555;">شكراً لتسجيلك معنا. استخدم الرمز التالي للتحقق من بريدك الإلكتروني:</p>
          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p style="font-size: 14px; color: #999;">هذا الرمز صالح لمدة 30 دقيقة فقط.</p>
          <p style="font-size: 14px; color: #999;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني.</p>
        </div>
      </div>
    `
        : `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333;">Email Verification Code</h2>
          <p style="font-size: 16px; color: #555;">Hello,</p>
          <p style="font-size: 16px; color: #555;">Thank you for registering with us. Use the following code to verify your email address:</p>
          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p style="font-size: 14px; color: #999;">This code is valid for 30 minutes only.</p>
          <p style="font-size: 14px; color: #999;">If you didn't request this code, please ignore this email.</p>
        </div>
      </div>
    `;

    const textBody =
      language === 'ar'
        ? `رمز التحقق من البريد الإلكتروني\n\nرمز التحقق الخاص بك هو: ${code}\n\nهذا الرمز صالح لمدة 30 دقيقة.`
        : `Email Verification Code\n\nYour verification code is: ${code}\n\nThis code is valid for 30 minutes.`;

    await this.sendEmail(email, subject, htmlBody, textBody);
  }

  async sendPasswordResetCode(
    email: string,
    code: string,
    language: string = 'en',
  ): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-password?email=${encodeURIComponent(email)}&code=${code}`;
    const subject =
      language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Password Reset';

    const htmlBody =
      language === 'ar'
        ? `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333;">إعادة تعيين كلمة المرور</h2>
          <p style="font-size: 16px; color: #555;">مرحباً،</p>
          <p style="font-size: 16px; color: #555;">تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. استخدم الرمز التالي:</p>
          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
            <h1 style="color: #dc3545; margin: 0; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p style="font-size: 16px; color: #555;">أو انقر على الرابط التالي:</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">إعادة تعيين كلمة المرور</a>
          </p>
          <p style="font-size: 14px; color: #999;">هذا الرمز صالح لمدة 5 دقائق فقط.</p>
          <p style="font-size: 14px; color: #999;">إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.</p>
        </div>
      </div>
    `
        : `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333;">Password Reset</h2>
          <p style="font-size: 16px; color: #555;">Hello,</p>
          <p style="font-size: 16px; color: #555;">We received a request to reset your password. Use the following code:</p>
          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
            <h1 style="color: #dc3545; margin: 0; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p style="font-size: 16px; color: #555;">Or click the following link:</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </p>
          <p style="font-size: 14px; color: #999;">This code is valid for 5 minutes only.</p>
          <p style="font-size: 14px; color: #999;">If you didn't request a password reset, please ignore this email.</p>
        </div>
      </div>
    `;

    const textBody =
      language === 'ar'
        ? `إعادة تعيين كلمة المرور\n\nرمز إعادة تعيين كلمة المرور الخاص بك هو: ${code}\n\nأو استخدم الرابط التالي: ${resetLink}\n\nهذا الرمز صالح لمدة 5 دقائق.`
        : `Password Reset\n\nYour password reset code is: ${code}\n\nOr use this link: ${resetLink}\n\nThis code is valid for 5 minutes.`;

    await this.sendEmail(email, subject, htmlBody, textBody);
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    try {
      const sentFrom = new Sender(this.senderEmail, this.senderName);
      const recipients = [new Recipient(to)];

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setSubject(subject)
        .setHtml(html)
        .setText(text);

      await this.mailerSend.email.send(emailParams);
      this.logWinston('info', 'email_sent', { to, subject });
    } catch (error) {
      this.logWinston('error', 'email_send_failed', {
        to,
        subject,
        error: normalizeError(error),
      });
      throw new InternalServerErrorException(
        this.i18n.t('common.errors.email_send_failed'),
      );
    }
  }

  private logWinston(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    payload?: unknown,
  ): void {
    const maybeWinston = this.logger as unknown as {
      info?: (meta: unknown) => void;
      warn?: (meta: unknown) => void;
      error?: (meta: unknown) => void;
      debug?: (meta: unknown) => void;
    };
    const fn = maybeWinston[level];
    if (typeof fn === 'function') {
      fn({ message, ...(payload as Record<string, unknown>) });
      return;
    }
    const payloadStr =
      payload == null ? '' : ` | payload=${this.toJsonSafe(payload)}`;
    const msg = `${message}${payloadStr}`;
    switch (level) {
      case 'error':
        this.logger.error(msg);
        break;
      case 'warn':
        this.logger.warn(msg);
        break;
      case 'debug':
        this.logger.debug?.(msg);
        break;
      default:
        this.logger.log?.(msg);
    }
  }

  private toJsonSafe(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return '"[unserializable payload]"';
    }
  }
}

function normalizeError(
  err: unknown,
):
  | { name?: string; message: string; stack?: string }
  | Record<string, unknown>
  | undefined {
  if (err == null) return undefined;
  if (typeof err === 'string') return { message: err };
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  try {
    const plain: unknown = JSON.parse(JSON.stringify(err));
    if (plain && typeof plain === 'object')
      return plain as Record<string, unknown>;
    return { detail: '[unserializable error]' };
  } catch {
    return { detail: '[unserializable error]' };
  }
}

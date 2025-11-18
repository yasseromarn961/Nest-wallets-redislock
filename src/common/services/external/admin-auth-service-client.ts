import axios from 'axios';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AdminAuthServiceClient {
  private readonly authServiceUrl: string;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.authServiceUrl = this.configService.get<string>(
      'adminAuthServiceUrl',
      'http://localhost:7000',
    );
  }

  /**
   * get all admins (with pagination, search, etc.)
   */
  async listAdmins<T = unknown>(
    token: string,
    query: Record<string, unknown> = {},
  ): Promise<T> {
    const res = await axios.get(`${this.authServiceUrl}/admin/admins`, {
      headers: { Authorization: token },
      params: query,
    });
    return res.data as T;
  }

  /**
   * get one admin by id
   */
  async getAdminById<T = unknown>(token: string, id: string): Promise<T> {
    const res = await axios.get(`${this.authServiceUrl}/admin/admins/${id}`, {
      headers: { Authorization: token },
    });
    return res.data as T;
  }

  /**
   * call /admins/me for verify auth token
   */
  async me<T = unknown>(token: string): Promise<T> {
    const res = await axios.get(`${this.authServiceUrl}/admin/admins/me`, {
      headers: { Authorization: token },
    });
    return res.data as T;
  }

  /**
   * admin login (email/password)
   */
  async login<T = unknown>(email: string, password: string): Promise<T> {
    // Prefer LoggerService.log which maps to 'info' in Nest/Winston
    this.logger.log?.({
      event: 'admin_auth_login_request',
      url: `${this.authServiceUrl}/admin/auth-sessions/email`,
    });
    const res = await axios.post(
      `${this.authServiceUrl}/admin/auth-sessions/email`,
      {
        email,
        password,
      },
    );
    return res.data as T;
  }

  /**
   * refresh token
   */
  async refresh<T = unknown>(refreshToken: string): Promise<T> {
    const res = await axios.post(
      `${this.authServiceUrl}/admin/auth-sessions/refresh`,
      {
        refreshToken,
      },
    );
    return res.data as T;
  }

  /**
   * destroy token on logout
   */
  async destroy<T = unknown>(
    accessToken: string,
    refreshToken: string,
  ): Promise<T> {
    const res = await axios.post(
      `${this.authServiceUrl}/admin/auth-sessions/destroy`,
      { refreshToken },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.data as T;
  }

  /**
   * verify 2FA code
   */
  async verify2FA<T = unknown>(tempToken: string, code: string): Promise<T> {
    const res = await axios.post(
      `${this.authServiceUrl}/admin/auth-sessions/verify-2fa`,
      { code },
      { headers: { Authorization: `Bearer ${tempToken}` } },
    );
    return res.data as T;
  }
}

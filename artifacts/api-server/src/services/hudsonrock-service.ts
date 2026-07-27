import axios from 'axios';
import { StolenCredential, APIResponse } from '../types/osint.js';

export class HudsonRockService {
  private client: any;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://cavalier.hudsonrock.com',
      timeout: 30000,
      headers: {
        'Authorization': this.apiKey,
        'User-Agent': 'MR7-AI-OSINT/2.0'
      }
    });
  }

  async searchEmail(email: string): Promise<APIResponse<StolenCredential[]>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get('/search', { params: { email } });

      const credentials: StolenCredential[] = (response.data || []).map((record: any) => ({
        email: record.email || email,
        password: record.password,
        hash: record.password_hash,
        source: record.infection_source || 'hudsonrock',
        dateCompromised: new Date(record.date_compromised || Date.now()),
        additionalData: {
          computerName: record.computer_name,
          operatingSystem: record.operating_system,
          ip: record.ip,
          country: record.country,
          stealerFamily: record.stealer_family,
          antiviruses: record.antiviruses,
          userProfile: record.user_profile
        }
      }));

      return {
        success: true,
        data: credentials,
        meta: {
          timestamp: new Date(),
          requestId: `hudson-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async searchUsername(username: string): Promise<APIResponse<StolenCredential[]>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get('/search', { params: { username } });

      return {
        success: true,
        data: response.data || [],
        meta: {
          timestamp: new Date(),
          requestId: `hudson-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async searchDomain(domain: string): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get('/domain', { params: { domain } });

      return {
        success: true,
        data: {
          domain,
          totalInfections: response.data.total || 0,
          infections: response.data.infections || [],
          topStealers: response.data.top_stealers || [],
          countries: response.data.countries || [],
          timeline: response.data.timeline || []
        },
        meta: {
          timestamp: new Date(),
          requestId: `hudson-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getStatistics(): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get('/stats');

      return {
        success: true,
        data: response.data,
        meta: {
          timestamp: new Date(),
          requestId: `hudson-stats-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async searchIP(ip: string): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get('/search', { params: { ip } });

      return {
        success: true,
        data: response.data || [],
        meta: {
          timestamp: new Date(),
          requestId: `hudson-ip-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  private handleError(error: any, startTime: number): APIResponse<any> {
    return {
      success: false,
      error: {
        code: error.response?.status?.toString() || 'UNKNOWN',
        message: error.message,
        details: error.response?.data
      },
      meta: { timestamp: new Date(), requestId: '', duration: Date.now() - startTime, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }
}

export default HudsonRockService;

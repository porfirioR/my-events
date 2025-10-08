import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { SUPA_BASE_KEY, SUPA_BASE_URL } from '../../../utility/constants';

@Injectable()
export class DbContextService {
  private dbClient: SupabaseClient<any, 'public', any>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>(SUPA_BASE_URL);
    const key = this.configService.get<string>(SUPA_BASE_KEY);
    this.dbClient = createClient(url, key);
  }

  public getConnection(): SupabaseClient<any, 'public', any> {
    return this.dbClient;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { SUPA_BASE_KEY, SUPA_BASE_URL } from '../../../utility/constants';

@Injectable()
export class DbContextService {
  constructor(private readonly configService: ConfigService) {}

  public getConnection = (): SupabaseClient<any, 'public', any> => {
    const url = this.configService.get<string>(SUPA_BASE_URL)
    const key = this.configService.get<string>(SUPA_BASE_KEY)
    const dbClient = createClient(url, key);
    return dbClient;
  };
}

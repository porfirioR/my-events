import { SupabaseClient } from "@supabase/supabase-js";
import { DbContextService } from ".";

export abstract class BaseAccessService {
  protected dbContext: SupabaseClient<any, 'public', any>;

  constructor(protected dbContextService: DbContextService) {
    this.dbContext = this.dbContextService.getConnection();
  }
}
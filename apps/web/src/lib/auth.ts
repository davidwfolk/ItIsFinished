import { AuthManager } from '@app/core';
import { supabase } from './powersync';

export const authManager = new AuthManager(supabase);

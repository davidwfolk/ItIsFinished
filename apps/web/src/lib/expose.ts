import { powersync, connector } from './powersync';
import { supabase } from './powersync';

// @ts-ignore
window.__DEBUG_POWERSYNC = powersync;
// @ts-ignore
window.__DEBUG_CONNECTOR = connector;
// @ts-ignore
window.__DEBUG_SUPABASE = supabase;

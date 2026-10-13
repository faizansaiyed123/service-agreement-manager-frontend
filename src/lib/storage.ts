const KEY = "sam.session.v1";
export interface Session { accessToken:string; refreshToken:string; expiresAt:number; }
export function readSession():Session|null { const raw=localStorage.getItem(KEY); if(!raw)return null; try { const s=JSON.parse(raw) as Session; return s.accessToken&&s.refreshToken?s:null; } catch { return null; } }
export function writeSession(input:{accessToken:string;refreshToken:string;expiresIn:number}) { localStorage.setItem(KEY, JSON.stringify({accessToken:input.accessToken,refreshToken:input.refreshToken,expiresAt:Date.now()+input.expiresIn*1000})); }
export function clearSession(){localStorage.removeItem(KEY);}
import { describe, it, expect } from 'vitest';
import { lintComponentSpec } from '../src/lint.js';

const warnings = (extra: Record<string, unknown> = {}) => lintComponentSpec({type:'Table', name:'appointments', properties:{columns:[{
  name:'Appointment',key:'starts_at',columnType:'datepicker',isTimeChecked:true,dateFormat:'DD/MM/YYYY',...extra,
}]}}).warnings;

describe('time display intent, without prescribing a timezone', () => {
  it('flags browser-local timed columns, not date-only or explicitly zoned columns', () => {
    expect(warnings().some(w=>w.includes('viewer\'s browser timezone'))).toBe(true);
    for(const extra of [{isTimeChecked:false},{columnVisibility:false},{timeZoneDisplay:'America/Sao_Paulo'},{timeZoneDisplay:'{{variables.businessZone}}'}])
      expect(warnings(extra).some(w=>w.includes('viewer\'s browser timezone'))).toBe(false);
  });
  it('flags duplicate clock formatting without mistaking escaped literal text for tokens', () => {
    expect(warnings({dateFormat:'DD/MM/YYYY HH:mm'}).some(w=>w.includes('time twice'))).toBe(true);
    expect(warnings({dateFormat:'DD/MM/YYYY [shift]'}).some(w=>w.includes('time twice'))).toBe(false);
    expect(warnings({dateFormat:'{{variables.format}}'}).some(w=>w.includes('time twice'))).toBe(false);
  });
  it('also checks time embedded in dateFormat when the native time toggle is off', () => {
    const result=warnings({isTimeChecked:false,dateFormat:'DD/MM/YYYY HH:mm'});
    expect(result.some(w=>w.includes("viewer's browser timezone"))).toBe(true);
    expect(result.some(w=>w.includes('time twice'))).toBe(false);
  });
});

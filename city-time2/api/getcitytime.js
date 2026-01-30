const { DateTime } = require('luxon');

const normalize = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const cityToTimezone = (raw) => {
  if (!raw) return null;
  const city = normalize(raw);
  const map = {
    espana: 'Europe/Madrid',
    spain: 'Europe/Madrid',
    madrid: 'Europe/Madrid',
    barcelona: 'Europe/Madrid',
    valencia: 'Europe/Madrid',
    sevilla: 'Europe/Madrid',
    malaga: 'Europe/Madrid',
    marbella: 'Europe/Madrid',
    bilbao: 'Europe/Madrid',
    zaragoza: 'Europe/Madrid',
    canarias: 'Atlantic/Canary',
    tenerife: 'Atlantic/Canary',
    gran_canaria: 'Atlantic/Canary',
    lisbon: 'Europe/Lisbon',
    lisboa: 'Europe/Lisbon',
    london: 'Europe/London',
    paris: 'Europe/Paris',
    roma: 'Europe/Rome',
    rome: 'Europe/Rome',
    mexico: 'America/Mexico_City',
    'mexico city': 'America/Mexico_City',
    cdmx: 'America/Mexico_City',
    bogota: 'America/Bogota',
    lima: 'America/Lima',
    santiago: 'America/Santiago',
    'buenos aires': 'America/Argentina/Buenos_Aires',
    buenos_aires: 'America/Argentina/Buenos_Aires',
    miami: 'America/New_York',
    new_york: 'America/New_York',
    'new york': 'America/New_York',
    los_angeles: 'America/Los_Angeles',
    'los angeles': 'America/Los_Angeles'
  };
  return map[city] || null;
};

const parseHHmm = (value, fallback) => {
  const source = value || fallback || '08:00';
  const [h, m] = source.split(':').map((part) => parseInt(part, 10));
  return {
    hour: Number.isFinite(h) ? h : 0,
    minute: Number.isFinite(m) ? m : 0,
    raw: source
  };
};

const getSaludo = (hour) => {
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

const DEFAULT_TZ = process.env.TIMEZONE_DEFAULT || 'Europe/Madrid';
const OFFICE_START = process.env.OFFICE_START || '08:00';
const OFFICE_END = process.env.OFFICE_END || '19:00';

module.exports = (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { ciudad, city, timezone, tz, inicio, fin } = req.query || {};
    const cityInput = ciudad || city || null;
    const tzCandidate = timezone || tz || cityToTimezone(cityInput) || DEFAULT_TZ;

    const dt = DateTime.now().setZone(tzCandidate);
    if (!dt.isValid) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_TIMEZONE',
        message: `Timezone "${tzCandidate}" is not valid`
      });
    }

    const start = parseHHmm(inicio, OFFICE_START);
    const end = parseHHmm(fin, OFFICE_END);

    const startDt = dt.set({
      hour: start.hour,
      minute: start.minute,
      second: 0,
      millisecond: 0
    });

    const endDt = dt.set({
      hour: end.hour,
      minute: end.minute,
      second: 0,
      millisecond: 0
    });

    const inHours = dt >= startDt && dt < endDt;

    const payload = {
      ok: true,
      ciudad: cityInput || (timezone || tz ? null : 'España'),
      timezone: tzCandidate,
      fecha: dt.toFormat('yyyy-LL-dd'),
      hora_24h: dt.toFormat('HH:mm'),
      saludo: getSaludo(dt.hour),
      in_hours: inHours,
      estado_horario: inHours ? 'in_hours' : 'out_hours',
      horario: {
        inicio: start.raw,
        fin: end.raw
      }
    };

    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: error?.message || 'Unexpected error'
    });
  }
};

import './env';
import { createDatabase } from './db';
import { connectionConfig } from './db/config';
import { sql } from 'drizzle-orm';
import * as s from './db/schema';
import { pacienteInput, profesionalInput, citaInput, atencionInput } from './validation';
import assert from 'node:assert/strict';

const marker = '[DEMO CLIDENT]';
// El usuario confirmó que el paciente preexistente 1 es ficticio y autorizó conservarlo.
const preservedPatientId = 1;
const origin = 'https://clident-preview-epgn1ftert.vercel.app';
const names = ['Camila Aravena Rojas', 'Tomás Leiva Fuentes', 'Valentina Cisternas Soto', 'Benjamín Valdés Lagos', 'Antonia Escobar Vera', 'Mateo Bustamante Díaz', 'Josefa Alarcón Silva', 'Vicente Paredes Muñoz', 'Francisca Olivares Peña', 'Diego Saavedra Flores', 'Isidora Sepúlveda Castro', 'Joaquín Contreras Molina', 'Catalina Espinoza Reyes', 'Agustín Figueroa Campos', 'María Paz Donoso Vidal', 'Nicolás Carrasco Bravo', 'Elena Mardones Toledo', 'Emilia Salinas Cortés'];
const births = ['1994-03-18', '1987-08-22', '2001-11-05', '2015-06-12', '1999-02-27', '2018-09-03', '1972-04-16', '1964-12-09', '1980-07-24', '1990-01-14', '2008-10-20', '1996-05-08', '1958-03-29', '1983-11-17', '1977-06-04', '2004-09-26', '1952-02-11', '2017-12-15'];
const team = [
  ['Fernanda', 'Riquelme Araya', 'Odontología General'],
  ['Matías', 'Orellana Véliz', 'Ortodoncia'],
  ['Constanza', 'Navarrete Pinto', 'Endodoncia'],
  ['Sebastián', 'Rebolledo Jara', 'Periodoncia'],
  ['Daniela', 'Sanhueza Poblete', 'Odontopediatría'],
  ['Ignacio', 'Bahamondes Tapia', 'Odontología General'],
  ['Paula', 'Henríquez Solís', 'Odontopediatría'],
];
// Cada fila: paciente, profesional, motivo, diagnóstico, procedimiento, recomendaciones.
const visits: [number, number, string, string, string, string][] = [
  [0, 0, 'Evaluación inicial y profilaxis', 'Gingivitis leve asociada a placa bacteriana.', 'Evaluación odontológica y profilaxis supragingival simuladas.', 'Cepillado suave dos veces al día y limpieza interdental diaria.'],
  [1, 2, 'Evaluación endodóntica de molar', 'Pulpitis irreversible simulada en pieza 3.6.', 'Evaluación y primera sesión de tratamiento endodóntico simulado.', 'Control en siete días; consultar ante dolor persistente.'],
  [2, 1, 'Control de aparatología fija', 'Maloclusión clase I en seguimiento simulado.', 'Control de ortodoncia y ajuste de arco simulados.', 'Mantener higiene alrededor de brackets y evitar alimentos duros.'],
  [3, 4, 'Evaluación dental infantil', 'Riesgo cariogénico moderado en dentición mixta.', 'Evaluación infantil y aplicación de barniz fluorado simuladas.', 'Cepillado supervisado y reducir la frecuencia de alimentos azucarados.'],
  [4, 5, 'Restauración de lesión de caries', 'Caries oclusal simulada en pieza 1.6.', 'Restauración directa de resina compuesta simulada.', 'Controlar higiene y revisar adaptación de la restauración.'],
  [5, 6, 'Control preventivo infantil', 'Dentición temporal sin lesiones cavitadas en caso simulado.', 'Profilaxis infantil e instrucción de higiene simuladas.', 'Cepillado supervisado por una persona adulta.'],
  [6, 3, 'Evaluación periodontal', 'Periodontitis estadio I simulada.', 'Evaluación periodontal y destartraje supragingival simulados.', 'Usar cepillos interdentales y asistir a mantenimiento periodontal.'],
  [7, 0, 'Evaluación de sensibilidad dental', 'Hipersensibilidad dentinaria cervical simulada.', 'Evaluación y aplicación de agente desensibilizante simuladas.', 'Usar cepillo suave y evitar cepillado abrasivo.'],
  [8, 3, 'Seguimiento periodontal', 'Gingivitis con mejoría clínica en caso simulado.', 'Mantenimiento periodontal y refuerzo de higiene simulados.', 'Mantener limpieza interdental diaria y control periódico.'],
  [9, 2, 'Control endodóntico', 'Evolución favorable de tratamiento endodóntico simulado en pieza 2.6.', 'Control clínico y planificación de restauración coronaria simulados.', 'Continuar con la rehabilitación de la pieza tratada.'],
  [10, 1, 'Evaluación de ortodoncia adolescente', 'Apiñamiento anterior leve simulado.', 'Evaluación ortodóncica y planificación de estudio simulado.', 'Revisar alternativas de tratamiento en próximo control.'],
  [11, 5, 'Control de restauración', 'Restauración simulada de pieza 4.6 con adaptación satisfactoria.', 'Control oclusal y pulido de restauración simulados.', 'Mantener higiene y realizar control preventivo.'],
  [12, 0, 'Evaluación de salud oral en persona mayor', '', '', ''],
  [13, 2, 'Evaluación por dolor en molar', '', '', ''],
  [14, 3, 'Control de encías y sangrado al cepillado', '', '', ''],
  [15, 1, 'Evaluación de alineación dental', '', '', ''],
  [16, 5, 'Evaluación de restauraciones antiguas', '', '', ''],
  [17, 6, 'Primera consulta odontopediátrica', '', '', ''],
  [0, 0, 'Control preventivo posterior a profilaxis', '', '', ''],
  [1, 2, 'Segunda sesión endodóntica de pieza 3.6', '', '', ''],
  [2, 1, 'Control mensual de ortodoncia', '', '', ''],
  [3, 4, 'Seguimiento de higiene y riesgo cariogénico', '', '', ''],
  [4, 5, 'Revisión de restauración de pieza 1.6', '', '', ''],
  [5, 6, 'Control preventivo infantil semestral', '', '', ''],
  [6, 3, 'Mantenimiento periodontal', '', '', ''],
  [10, 1, 'Revisión de estudio ortodóncico', '', '', ''],
];
function rut(n: number) {
  let sum = 0, factor = 2;
  for (const digit of String(n).split('').reverse()) { sum += Number(digit) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const dv = 11 - sum % 11;
  return `${n}-${dv === 11 ? '0' : dv === 10 ? 'K' : dv}`;
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function date(offset: number) { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); }
function chileTime(fecha: string, hora: string) {
  const provisional = new Date(`${fecha}T${hora.slice(0, 5)}:00Z`);
  const tz = new Intl.DateTimeFormat('en', { timeZone: 'America/Santiago', timeZoneName: 'shortOffset' }).formatToParts(provisional).find(p => p.type === 'timeZoneName')!.value;
  const hours = Number(tz.replace('GMT', '') || '0');
  return new Date(provisional.getTime() - hours * 3600000);
}
async function main() {
  connectionConfig(true); // Comprueba equivalencia entre URL agrupada y directa, sin imprimirlas.
  assert.ok(new URL(process.env.DATABASE_URL!).hostname.endsWith('.neon.tech'), 'La carga requiere Neon.');
  const db = createDatabase();
  let cookie = '';
  async function api(path: string) {
    const response = await fetch(`${origin}/api/${path}`, { headers: { cookie } });
    assert.equal(response.status, 200, `Verificación Preview ${path}: HTTP ${response.status}`);
    return response.json();
  }
  try {
    const login = await fetch(`${origin}/api/auth/sign-in/email`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.BOOTSTRAP_EMAIL, password: process.env.BOOTSTRAP_PASSWORD }) });
    assert.equal(login.status, 200, 'Se necesita verificar el destino mediante el administrador del Preview.');
    cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
    const me = await api('me');
    const remote = await Promise.all(['pacientes', 'profesionales', 'citas', 'atenciones'].map(api));
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(728112)`);
      await tx.execute(sql`LOCK TABLE pacientes, profesionales, citas, atenciones IN SHARE ROW EXCLUSIVE MODE`);
      const accounts = await tx.select({ id: s.user.id, email: s.user.email, role: s.user.role }).from(s.user);
      assert.ok(accounts.some(u => u.id === me.id && u.role === 'ADMINISTRADOR'), 'El Preview no coincide con la identidad de esta base Neon.');
      const patients = await tx.select().from(s.pacientes);
      const professionals = await tx.select().from(s.profesionales);
      const appointments = await tx.select().from(s.citas);
      const encounters = await tx.select().from(s.atenciones);
      const preservedPatient = patients.find(p => p.id === preservedPatientId);
      assert.ok(preservedPatient, 'El paciente ficticio autorizado ya no está presente; revisa el destino.');
      const demoPatients = patients.filter(p => p.id !== preservedPatientId);
      const lists = [patients, professionals, appointments, encounters];
      for (let i = 0; i < lists.length; i++) assert.deepEqual(lists[i].map(r => r.id).sort((a,b) => a-b), remote[i].map((r: {id:number}) => r.id).sort((a:number,b:number) => a-b), 'Los registros de Neon y Preview no coinciden; no se escribe.');
      console.log('Destino Neon verificado contra la identidad y los registros del Preview; conexiones equivalentes.');
      console.log(`Registros existentes: ${professionals.length} profesionales; ${patients.length} pacientes; ${appointments.length} citas; ${encounters.length} atenciones.`);
      console.log(`IDs de pacientes sin marca: ${patients.filter(p => !p.name.endsWith(marker)).map(p => p.id).join(', ') || 'ninguno'}.`);
      console.log(`Sin marca de demostración: ${professionals.filter(p => !p.apellido.endsWith(marker)).length} profesionales; ${patients.filter(p => !p.name.endsWith(marker)).length} pacientes; ${appointments.filter(c => !c.motivo.startsWith(`${marker} C`)).length} citas; ${encounters.filter(a => !a.observaciones.startsWith(marker)).length} atenciones.`);
      const clean = demoPatients.every(p => p.name.endsWith(marker) && p.email.endsWith('@example.test')) && professionals.every(p => p.apellido.endsWith(marker) && p.userId === null) && appointments.every(c => c.motivo.startsWith(`${marker} C`)) && encounters.every(a => a.observaciones.startsWith(marker));
      assert.ok(clean, 'Hay datos clínicos no identificados como demostrativos. Operación detenida antes de escribir.');
      if ([demoPatients, professionals, appointments, encounters].some(l => l.length > 0)) {
        assert.deepEqual([demoPatients.length, professionals.length, appointments.length, encounters.length], [18, 7, 26, 12], 'Existe una carga incompleta o diferente. No se modifica.');
        assert.deepEqual(demoPatients.map(p => p.rut).sort(), names.map((_,i) => rut(99000001+i)).sort(), 'Los identificadores demostrativos no corresponden a esta carga.');
        assert.deepEqual(professionals.map(p => p.nombre+' '+p.apellido).sort(), team.map(p => `${p[0]} ${p[1]} ${marker}`).sort(), 'Los profesionales no corresponden a esta carga.');
        assert.deepEqual(appointments.map(c => c.motivo).sort(), visits.map((v,i) => `${marker} C${String(i+1).padStart(2,'0')} · ${v[2]}`).sort(), 'Las citas no corresponden a esta carga.');
        console.log('Carga ya presente: cero inserciones; no se modifican registros.');
        return { created: false, patientIds: demoPatients.map(p => p.id), preservedPatient };
      }
      if (!process.argv.includes('--apply')) { console.log('Base clínica vacía y apta. Para insertar, usa --apply.'); return { created: false, patientIds: [] }; }
      const p = await tx.insert(s.pacientes).values(names.map((name,i) => pacienteInput.parse({ name: `${name} ${marker}`, rut: rut(99000001+i), fechaNacimiento: births[i], email: `paciente.demo.${String(i+1).padStart(2,'0')}@example.test`, phone: '+56000000000' }))).returning();
      const pro = await tx.insert(s.profesionales).values(team.map(([nombre,apellido,especialidad]) => profesionalInput.parse({ nombre, apellido: `${apellido} ${marker}`, especialidad, userId: null }))).returning();
      const c = await tx.insert(s.citas).values(visits.map(([pi,pr,motivo],i) => citaInput.parse({ pacienteId: p[pi].id, profesionalId: pro[pr].id, fecha: date(i < 12 ? -14+i : i < 16 ? 0 : 1+(i-16)), hora: `${String(9 + Math.floor((i%12)/2)).padStart(2,'0')}:${i%2 ? '30' : '00'}`, motivo: `${marker} C${String(i+1).padStart(2,'0')} · ${motivo}` }))).returning();
      await tx.insert(s.atenciones).values(visits.slice(0,12).map((v,i) => ({ ...atencionInput.parse({ citaId: c[i].id, diagnostico: v[3], tratamiento: v[4], observaciones: `${marker} Antecedentes completamente ficticios para portafolio. Recomendaciones simuladas: ${v[5]}` }), createdAt: chileTime(c[i].fecha,c[i].hora), updatedAt: chileTime(c[i].fecha,c[i].hora) })));
      console.log('Transacción: 7 profesionales, 18 pacientes, 26 citas y 12 atenciones creados.');
      return { created: true, patientIds: p.map(x => x.id), preservedPatient };
    });
    if (result.patientIds.length) {
      const [patients, professionals, appointments, encounters, dashboard] = await Promise.all(['pacientes', 'profesionales', 'citas', 'atenciones', 'dashboard'].map(api));
      assert.deepEqual([patients.length, professionals.length, appointments.length, encounters.length], [19,7,26,12]);
      assert.equal(new Set(patients.map((p: {rut:string}) => p.rut)).size,19);
      const currentPatients = await db.select().from(s.pacientes);
      assert.deepEqual(currentPatients.find(p => p.id === preservedPatientId), result.preservedPatient, 'El paciente preexistente debe permanecer intacto.');
      assert.equal(new Set(appointments.map((c: {profesionalId:number;fecha:string;hora:string}) => `${c.profesionalId}/${c.fecha}/${c.hora}`)).size,26);
      assert.equal(new Set(encounters.map((a: {citaId:number}) => a.citaId)).size,12);
      for (const c of appointments) assert.ok(patients.some((p: {id:number}) => p.id === c.pacienteId) && professionals.some((p: {id:number}) => p.id === c.profesionalId));
      const histories = await Promise.all(result.patientIds.map(id => api(`pacientes/${id}/historial`)));
      assert.equal(histories.reduce((sum,list) => sum+list.length,0),12);
      assert.deepEqual(dashboard.counts,{pacientes:19,citas:26,atenciones:12});
      assert.ok(dashboard.upcoming.length > 0);
      console.log('Preview/API: totales, relaciones, RUT únicos, agenda sin cruces, 12 atenciones en historiales y dashboard verificados.');
    }
  } finally {
    if (cookie) await fetch(`${origin}/api/auth/sign-out`,{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:'{}'});
    await db.$client.end();
  }
}
main().catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Carga/verificación fallida. No se muestran credenciales ni datos privados.');
  const code = error.cause?.code || error.code;
  if (typeof code === 'string' && /^[A-Z0-9_]+$/.test(code)) console.error(`Código: ${code}`);
  if (error.name === 'ZodError') console.error(JSON.stringify(error.issues.map((i: {path: unknown[]; message: string}) => ({ campo: i.path.join('.'), error: i.message }))));
  process.exitCode=1;
});

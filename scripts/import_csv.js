require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = process.argv[2];
if (!filePath) {
  console.error('Utilizare: node scripts/import_csv.js ./leads.csv');
  process.exit(1);
}

const absPath = path.resolve(process.cwd(), filePath);
if (!fs.existsSync(absPath)) {
  console.error('Fișier inexistent:', absPath);
  process.exit(1);
}

const ext = path.extname(absPath).toLowerCase();
if (!['.csv', '.json'].includes(ext)) {
  console.error('Format neacceptat. Folosește fișier .csv sau .json');
  process.exit(1);
}

if (ext === '.csv') importFromCsv(absPath);
else importFromJson(absPath);

function importFromCsv(file) {
  let total = 0;
  const rows = [];
  fs.createReadStream(file)
    .pipe(csv())
    .on('data', (row) => {
      total++;
      const normalized = normalizeRow(row);
      if (normalized) rows.push(normalized);
    })
    .on('end', async () => {
      await uploadRows(rows, total);
    })
    .on('error', (err) => {
      console.error('Eroare la citirea CSV:', err.message);
      process.exit(1);
    });
}

async function importFromJson(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed)) {
      console.error('JSON invalid: trebuie să fie array de obiecte.');
      process.exit(1);
    }
    let total = 0;
    const rows = [];
    for (const row of parsed) {
      total++;
      const normalized = normalizeRow(row);
      if (normalized) rows.push(normalized);
    }
    await uploadRows(rows, total);
  } catch (err) {
    console.error('Eroare la citirea JSON:', err.message);
    process.exit(1);
  }
}

function normalizeRow(row) {
  const telefon = (row.telefon || '').trim();
  if (!telefon || telefon.toUpperCase() === 'N/A') return null;
  return {
    prioritate: row.prioritate ? Number(row.prioritate) : 0,
    nume_companie: normalizeText(row.nume_companie),
    telefon,
    locatie: normalizeText(row.locatie),
    domeniu: normalizeText(row.domeniu),
    are_site: normalizeText(row.are_site),
    website: normalizeWebsite(row.website),
    rating: row.rating != null ? String(row.rating) : null,
    numar_recenzii: row.numar_recenzii ? Number(row.numar_recenzii) : 0,
    google_maps_url: normalizeText(row.google_maps_url),
    comentariu_cold_call: normalizeText(row.comentariu_cold_call)
  };
}

function normalizeText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text === '-' || text === '—') return null;
  return text;
}

function normalizeWebsite(value) {
  const site = normalizeText(value);
  if (!site) return null;
  if (site.startsWith('http://') || site.startsWith('https://')) return site;
  return `https://${site}`;
}

async function uploadRows(rows, total) {
  let imported = 0;
  const deduped = dedupeRows(rows);
  console.log(`Citite ${total} rânduri. Se importă ${deduped.length} lead-uri valide...`);
  for (const batch of chunk(deduped, 100)) {
    const { error } = await supabase.from('leads').upsert(batch, {
      onConflict: 'nume_companie,telefon'
    });
    if (error) {
      console.error('Eroare la import:', error.message);
      console.error('Adaugă UNIQUE (nume_companie, telefon) în Supabase.');
      process.exitCode = 1;
      return;
    }
    imported += batch.length;
    process.stdout.write(`Importate ${imported} / ${deduped.length}\r`);
  }
  console.log(`\nImport finalizat. Importate ${imported} lead-uri.`);
}

function dedupeRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.nume_companie || ''}__${row.telefon || ''}`;
    map.set(key, row);
  }
  return Array.from(map.values());
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

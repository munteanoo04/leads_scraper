# Leads CRM (Cold Call Dashboard)

Aplicatie minimală de tip CRM pentru gestionarea lead-urilor de cold call, construită cu Node.js, Express, Supabase și frontend simplu HTML + JS.

## Cum rulezi proiectul

```bash
# 1. Instalează dependențele
npm install

# 2. Creează fișierul .env cu credențiale Supabase
# Format:
# SUPABASE_URL=https://xxxxx.supabase.co
# SUPABASE_ANON_KEY=eyJxxx...
# PORT=3000

# 3. Creează tabela în Supabase (SQL editor)
# Vezi schema:
# CREATE TABLE leads (
#   id SERIAL PRIMARY KEY,
#   prioritate INTEGER DEFAULT 0,
#   nume_companie TEXT,
#   telefon TEXT,
#   locatie TEXT,
#   domeniu TEXT,
#   are_site TEXT,
#   website TEXT,
#   rating TEXT,
#   numar_recenzii INTEGER DEFAULT 0,
#   google_maps_url TEXT,
#   comentariu_cold_call TEXT,
#   status TEXT DEFAULT 'de_sunat',
#   resunat_data TEXT,
#   resunat_ora TEXT,
#   nota TEXT,
#   created_at TIMESTAMPTZ DEFAULT NOW(),
#   updated_at TIMESTAMPTZ DEFAULT NOW()
# );

# 4. Importă CSV-ul cu lead-uri
node scripts/import_csv.js ./chisinau_leads_20260329_1548.csv

# 5. Pornește serverul în modul development
npm run dev

# 6. Deschide aplicația în browser
# http://localhost:3000
```

CSV-ul trebuie să aibă exact coloanele:

- prioritate
- nume_companie
- telefon
- locatie
- domeniu
- are_site
- website
- rating
- numar_recenzii
- google_maps_url
- comentariu_cold_call

Toate textele din interfață sunt în limba română, iar datele sunt păstrate în memorie pentru navigare offline; apelurile către Supabase se fac doar la schimbarea statusului sau salvarea notelor.*** End Patch``` |

require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res, next) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Lipsesc variabilele SUPABASE_URL sau SUPABASE_ANON_KEY în environment'
    });
  }
  next();
});

function mapLead(row) {
  return {
    id: row.id,
    prioritate: row.prioritate,
    nume_companie: row.nume_companie,
    telefon: row.telefon,
    locatie: row.locatie,
    domeniu: row.domeniu,
    are_site: row.are_site,
    website: row.website,
    rating: row.rating,
    numar_recenzii: row.numar_recenzii,
    google_maps_url: row.google_maps_url,
    comentariu_cold_call: row.comentariu_cold_call,
    status: row.status,
    resunat_data: row.resunat_data,
    resunat_ora: row.resunat_ora,
    nota: row.nota
  };
}

app.get('/api/leads', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('prioritate', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.or(`nume_companie.ilike.${term},domeniu.ilike.${term}`);
    }

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: 'Eroare la încărcarea lead-urilor', details: error.message });

    res.json({
      items: (data || []).map(mapLead),
      total: count || 0,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (e) {
    res.status(500).json({ error: 'Eroare internă', details: e.message });
  }
});

app.get('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
    if (error) return res.status(500).json({ error: 'Eroare la încărcarea lead-ului', details: error.message });
    if (!data) return res.status(404).json({ error: 'Lead inexistent' });
    res.json(mapLead(data));
  } catch (e) {
    res.status(500).json({ error: 'Eroare internă', details: e.message });
  }
});

app.patch('/api/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resunat_data, resunat_ora } = req.body || {};
    if (!status) return res.status(400).json({ error: 'Status lipsă' });

    const payload = { status, updated_at: new Date().toISOString() };
    if (status === 'de_resunat') {
      payload.resunat_data = resunat_data || null;
      payload.resunat_ora = resunat_ora || null;
    } else {
      payload.resunat_data = null;
      payload.resunat_ora = null;
    }

    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: 'Eroare la salvarea statusului', details: error.message });
    res.json(mapLead(data));
  } catch (e) {
    res.status(500).json({ error: 'Eroare internă', details: e.message });
  }
});

app.patch('/api/leads/:id/nota', async (req, res) => {
  try {
    const { id } = req.params;
    const { nota } = req.body || {};
    const { data, error } = await supabase
      .from('leads')
      .update({ nota: nota || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Eroare la salvarea notei', details: error.message });
    res.json(mapLead(data));
  } catch (e) {
    res.status(500).json({ error: 'Eroare internă', details: e.message });
  }
});

app.get('/api/stats', async (_req, res) => {
  try {
    const statuses = ['de_sunat', 'sunat', 'de_resunat', 'acceptat', 'refuzat'];
    const counts = {};
    let total = 0;

    for (const st of statuses) {
      const { count, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', st);
      if (error) return res.status(500).json({ error: 'Eroare la statistici', details: error.message });
      counts[st] = count || 0;
      total += counts[st];
    }

    res.json({
      total,
      de_sunat: counts.de_sunat,
      de_resunat: counts.de_resunat,
      acceptat: counts.acceptat,
      refuzat: counts.refuzat,
      sunat: counts.sunat
    });
  } catch (e) {
    res.status(500).json({ error: 'Eroare internă', details: e.message });
  }
});

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`CRM rulează pe http://localhost:${port}`);
  });
}

module.exports = app;

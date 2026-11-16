import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from 'react-native';
import { EVENTS, EventItem, Kind, PROFILES, Profile, statsFor, topLists, PAST, shortOf, mainTarget, getProfile, placeCC } from './data';
import { startLine } from './Trip';
import { Logo } from './Chrome';

const KIND_LABEL: Record<Kind, string> = { user: 'User', venue: 'Venue', organiser: 'Organiser', artist: 'Artist' };

// ---------- Menu ----------
export type MenuItem = { label: string; sub?: string; soon?: boolean; onPress?: () => void };

export function Menu({ main, settings, onClose, onLogo }: { main: MenuItem[]; settings: MenuItem[]; onClose: () => void; onLogo?: () => void }) {
  const row = (m: MenuItem) => (
    <Pressable key={m.label} style={s.mRow} onPress={() => { if (m.soon || !m.onPress) return; onClose(); m.onPress(); }}>
      <View style={{ flex: 1 }}>
        <Text style={[s.mLabel, m.soon && { opacity: 0.5 }]}>{m.label}</Text>
        {!!m.sub && <Text style={s.mSub}>{m.sub}</Text>}
      </View>
      {m.soon && <Text style={s.soon}>SOON</Text>}
    </Pressable>
  );
  return (
    <View style={s.wrap}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={s.panel}>
        <View style={s.mHead}>
          <Pressable onPress={() => { onClose(); if (onLogo) onLogo(); }} hitSlop={8}><Logo size={14} /></Pressable>
          <Pressable onPress={onClose} hitSlop={14} style={s.x}><Text style={s.xT}>✕</Text></Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {main.map(row)}
          <Text style={s.sect}>SETTINGS</Text>
          {settings.map(row)}
        </ScrollView>
      </View>
    </View>
  );
}

// ---------- Search ----------
// Sample availability until real ticket data is connected: the second night is shown as sold out.
const soldOut = (e: EventItem) => e.id.endsWith('-19');
// One row per result: label first, then the name, then a very short line. Labels run alphabetically, Users always come last.
const ORDER = ['Artist', 'Event', 'Organiser', 'Venue', 'User'];
type Hit =
  | { key: string; type: 'profile'; p: Profile; label: string; sub: string }
  | { key: string; type: 'event'; evs: EventItem[]; label: string; sub: string; mode: 'single' | 'multi' | 'yearly' };

function buildIndex(): Hit[] {
  const out: Hit[] = [];
  const nameCount: Record<string, number> = {};
  PROFILES.forEach((p) => { nameCount[p.kind + ':' + p.name.toLowerCase()] = (nameCount[p.kind + ':' + p.name.toLowerCase()] || 0) + 1; });
  PROFILES.forEach((p) => {
    const clash = nameCount[p.kind + ':' + p.name.toLowerCase()] > 1;
    // The founding year only shows when two artists share the exact same name.
    const sub = clash && p.kind === 'artist' && p.founded ? `Founded ${p.founded}` : p.kind === 'user' ? '' : shortOf(p);
    out.push({ key: p.kind + p.id, type: 'profile', p, label: KIND_LABEL[p.kind], sub });
  });
  // A yearly festival is one row (people pick their year on its timeline). Upcoming dates of one run share one row.
  // Past events each keep their own row, with the full date.
  const groups: Record<string, EventItem[]> = {};
  EVENTS.forEach((e) => { const k = e.title + '|' + (e.tour || '') + '|' + (e.recurring ? 'y' : e.status); (groups[k] = groups[k] || []).push(e); });
  Object.keys(groups).forEach((k) => {
    const evs = groups[k].slice().sort((a, b) => a.sortKey - b.sortKey);
    const first = evs[0];
    if (first.recurring) {
      out.push({ key: 'ev' + k, type: 'event', evs, label: 'Event', sub: `yearly festival · ${placeCC(first)}`, mode: 'yearly' });
    } else if (first.status === 'upcoming') {
      out.push({ key: 'ev' + k, type: 'event', evs, label: 'Event', sub: evs.length > 1 ? `${evs.length} dates` : `${first.dateLabel} · ${placeCC(first)}`, mode: evs.length > 1 ? 'multi' : 'single' });
    } else {
      evs.forEach((e) => out.push({ key: 'ev' + e.id, type: 'event', evs: [e], label: 'Event', sub: `${e.dateLabel} · ${placeCC(e)}`, mode: 'single' }));
    }
  });
  return out;
}

const nameOf = (h: Hit) => (h.type === 'profile' ? h.p.name : h.evs[0].title);
const rank = (h: Hit) => ORDER.indexOf(h.label);
// Events run in time order: coming up first (soonest first), then the past (latest first).
const evOrder = (h: Hit) => (h.type === 'event' ? (h.evs[0].status === 'upcoming' ? h.evs[0].sortKey : 1e9 - h.evs[0].sortKey) : 0);

export function Search({ q, onClose, onProfile, onEvent, onAddPast }: { q: string; onClose: () => void; onProfile: (kind: Kind, id: string) => void; onEvent: (ev: EventItem) => void; onAddPast: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const index = useMemo(buildIndex, []);
  const needle = q.trim().toLowerCase().replace(/^@/, '');
  const hits = useMemo(() => {
    if (!needle) return index.filter((h) => h.type === 'event' && h.evs[0].status === 'upcoming' && h.mode !== 'yearly').sort((a, b) => evOrder(a) - evOrder(b)).slice(0, 6);
    // People can only be found by their exact username, for privacy.
    const found = index.filter((h) => {
      if (h.type === 'profile' && h.p.kind === 'user') return !!h.p.username && h.p.username.toLowerCase() === needle;
      return nameOf(h).toLowerCase().includes(needle);
    });
    return found.sort((a, b) => rank(a) - rank(b) || (a.label === 'Event' && b.label === 'Event' && nameOf(a) === nameOf(b) ? evOrder(a) - evOrder(b) : nameOf(a).localeCompare(nameOf(b)))).slice(0, 30);
  }, [needle, index]);
  return (
    <View style={s.sWrap}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
        {!needle && <Text style={s.hint}>❔ Coming up. To find a person, type their exact username.</Text>}
        {needle && hits.length === 0 && <Text style={s.hint}>Nothing found. People only appear when you type their exact username.</Text>}
        {hits.map((h) => {
          const multi = h.type === 'event' && h.mode === 'multi';
          const chron = h.type === 'profile' && h.p.kind === 'user' && h.p.chronicler;
          return (
            <View key={h.key}>
              <Pressable style={s.hit} onPress={() => {
                if (h.type === 'profile') { onClose(); onProfile(h.p.kind, h.p.id); }
                else if (h.mode === 'multi') setOpen(open === h.key ? null : h.key);
                else if (h.mode === 'yearly') { const tg = mainTarget(h.evs[0]); onClose(); onProfile(tg.kind, tg.id); }
                else { onClose(); onEvent(h.evs[0]); }
              }}>
                <Text style={s.lab} numberOfLines={1}>{h.label}</Text>
                <Text style={s.hitRow} numberOfLines={1}>
                  <Text style={s.hitT}>{nameOf(h)}</Text>
                  {h.type === 'event' && (h.evs[0].sub === 'Opera' || h.evs[0].sub === 'Theatre') ? <Text style={s.hitT}> {h.evs[0].sub}</Text> : null}
                  {chron ? <Text style={s.hitT}> 📜</Text> : null}
                  {h.type === 'profile' && h.p.kind === 'user' && h.p.username ? <Text style={s.hitS}>  @{h.p.username}</Text> : null}
                  {!!h.sub && <Text style={s.hitS}>  {h.sub}</Text>}
                </Text>
                <Text style={s.chev}>{multi ? (open === h.key ? '⌃' : '⌄') : '›'}</Text>
              </Pressable>
              {multi && open === h.key && h.type === 'event' && (
                <>
                  <Pressable style={s.date} onPress={() => { const tg = mainTarget(h.evs[0]); onClose(); onProfile(tg.kind, tg.id); }}>
                    <Text style={s.hitT}>Open {tg0(h)} Timelane  ›</Text>
                  </Pressable>
                  {h.evs.map((e) => (
                    <Pressable key={e.id} style={s.date} onPress={() => { onClose(); onEvent(e); }}>
                      <Text style={s.hitT}>{e.dateLabel}</Text>
                      <Text style={s.hitS}>{getProfile('venue', e.venueId).name} · {placeCC(e)} · {startLine(e).replace('dum', '')}</Text>
                      <Text style={[s.avail, soldOut(e) && { color: '#ff8f80' }]}>{soldOut(e) ? 'Sold out dum' : 'Tickets available dum'}</Text>
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          );
        })}
        <Pressable style={s.addRow} onPress={onAddPast}>
          <Text style={s.addT}>Can't find it? Add a past event</Text>
          <Text style={s.chev}>›</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
const tg0 = (h: Hit) => (h.type === 'event' ? mainTarget(h.evs[0]).name : '');

// ---------- Stats popup ----------
export function Stats({ events, onClose, masked, title, rows: rowsIn }: { events: EventItem[]; onClose: () => void; masked?: boolean; title?: string; rows?: { label: string; value: string }[] }) {
  const rows = rowsIn || statsFor(events, !!masked);
  const lists = rowsIn ? [] : topLists(events);
  return (
    <View style={s.cWrap}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={s.card}>
        <View style={s.mHead}>
          <Text style={s.cT}>{title || 'Your stats'}</Text>
          <Pressable onPress={onClose} hitSlop={14} style={s.x}><Text style={s.xT}>✕</Text></Pressable>
        </View>
        <ScrollView style={{ maxHeight: 420 }}>
          {rows.map((r) => (
            <View key={r.label} style={s.stat}><Text style={s.statL}>{r.label}</Text><Text style={s.statV}>{r.value}</Text></View>
          ))}
          {lists.map((l) => (
            <View key={l.title} style={{ marginTop: 14 }}>
              <Text style={s.sect}>{l.title.toUpperCase()}</Text>
              {masked ? <Text style={s.statV}>Friends only</Text> : l.rows.length === 0 ? <Text style={s.statL}>Nothing yet</Text> : l.rows.map((r) => (
                <View key={r.name} style={s.stat}><Text style={s.statL}>{r.name}</Text><Text style={s.statV}>{r.pct}%</Text></View>
              ))}
            </View>
          ))}
          <Text style={s.hint}>❔ dum content. More stats and a full page later.</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50 },
  panel: { width: '78%', backgroundColor: '#1d1e22', paddingTop: 34, paddingHorizontal: 18 },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  x: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center' },
  xT: { color: '#fff', fontSize: 15, fontWeight: '700' },
  mRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  mLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  mSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  soon: { color: '#ee6e65', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  sect: { color: '#ee6e65', fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginTop: 22, marginBottom: 2 },
  sWrap: { position: "absolute", top: 92, left: 0, right: 0, bottom: 0, backgroundColor: '#1d1e22', paddingTop: 6, zIndex: 30 },
  sBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 8 },
  sInput: { flex: 1, height: 42, borderRadius: 21, backgroundColor: '#3b3c42', color: '#fff', paddingHorizontal: 16, fontSize: 14 },
  cancel: { marginLeft: 10 },
  cancelT: { color: '#ffb4a8', fontWeight: '700', fontSize: 14 },
  hint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, padding: 16 },
  hit: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  hitT: { color: '#fff', fontSize: 15, fontWeight: '700' },
  lab: { width: 58, color: '#ee6e65', fontSize: 11, fontWeight: '800' },
  hitRow: { flex: 1 },
  hitS: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '400' },
  chev: { color: '#fff', fontSize: 20, marginLeft: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18 },
  addT: { color: '#ffb4a8', fontSize: 14, fontWeight: '700' },
  avail: { color: '#8fd9a8', fontSize: 11, fontWeight: '700', marginTop: 2 },
  date: { paddingVertical: 10, paddingLeft: 34, paddingRight: 18, backgroundColor: '#26272b', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  fl: { color: '#ffb4a8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  fi: { height: 42, borderRadius: 10, backgroundColor: '#3b3c42', color: '#fff', paddingHorizontal: 14, fontSize: 14 },
  hintL: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 6 },
  save: { height: 46, borderRadius: 23, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  saveT: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 },
  card: { width: '100%', backgroundColor: '#26272b', borderRadius: 18, padding: 18 },
  cT: { color: '#fff', fontSize: 18, fontWeight: '700' },
  stat: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  statL: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  statV: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 12, flexShrink: 1, textAlign: 'right' },
});

// ---------- Add a past event ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function AddPast({ onClose, onSave }: { onClose: () => void; onSave: (ev: EventItem) => void }) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [where, setWhere] = useState('');
  const now = new Date();
  const yr = parseInt(year, 10);
  const mo = Math.min(12, Math.max(0, parseInt(month, 10) || 0));
  const inFuture = yr === now.getFullYear() && mo > now.getMonth() + 1;
  const ok = name.trim().length > 0 && yr >= 1900 && yr <= now.getFullYear() && !inFuture;
  const save = () => {
    if (!ok) return;
    const title = name.trim();
    onSave({
      id: 'mine-' + Date.now(), title, dateLabel: mo ? `${MON[mo - 1]} ${yr}` : String(yr), sortKey: yr * 10000 + (mo || 6) * 100 + 15,
      place: where.trim() || 'Added by you', attendance: 5000, status: 'past', elements: PAST, venueId: 'user-venue', organiserId: 'user-org',
      artists: [{ name: title, role: 'Headliner' }], note: 'Added by you.',
    });
  };
  const field = (label: string, v: string, set: (x: string) => void, ph: string, num?: boolean) => (
    <View style={{ marginTop: 12 }}>
      <Text style={s.fl}>{label}</Text>
      <TextInput value={v} onChangeText={set} placeholder={ph} placeholderTextColor="#777" keyboardType={num ? 'number-pad' : 'default'} style={s.fi} />
    </View>
  );
  return (
    <View style={s.sWrap}>
      <View style={[s.sBar, { justifyContent: 'space-between' }]}>
        <Text style={s.cT}>Add a past event</Text>
        <Pressable onPress={onClose} hitSlop={12}><Text style={s.cancelT}>Cancel</Text></Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 18 }}>
        <Text style={s.hintL}>It goes straight onto your Timelane, in the right place for its date.</Text>
        {field('What was it?', name, setName, 'e.g. Glastonbury, Radiohead, Jazz night')}
        {field('Year', year, setYear, 'e.g. 2019', true)}
        {field('Month (optional, 1 to 12)', month, setMonth, 'e.g. 6', true)}
        {field('Where? (optional)', where, setWhere, 'City or venue')}
        {inFuture && <Text style={[s.hintL, { color: '#ff8f80' }]}>That month has not happened yet.</Text>}
        <Pressable style={[s.save, !ok && { opacity: 0.4 }]} onPress={save}><Text style={s.saveT}>Add to my Timelane</Text></Pressable>
      </ScrollView>
    </View>
  );
}

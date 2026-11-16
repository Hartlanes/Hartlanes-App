import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { QR } from './Trip';

// Member offers for the whole platform, like a card programme: filter by city, topic and discount, save the ones you want.
// Saved offers feed the curated digest. To use one, the member shows their Hartlanes pass (a code that changes, so it cannot be copied).
export type Offer = { id: string; brand: string; city: string; topic: string; pct: number; text: string };
export const OFFERS: Offer[] = [
  { id: 'o1', brand: 'Tottenham Arms Hotel dum', city: 'London', topic: 'Stay', pct: 20, text: 'Nearest hotel to the stadium, 20% off the room rate' },
  { id: 'o2', brand: 'Brasserie Nord dum', city: 'London', topic: 'Eat', pct: 30, text: '30% off food before the show' },
  { id: 'o3', brand: 'Madame Tussauds London dum', city: 'London', topic: 'Visit', pct: 15, text: 'Fast-track entry, 15% off' },
  { id: 'o4', brand: 'London Eye dum', city: 'London', topic: 'Visit', pct: 10, text: 'Flexible date ticket, 10% off' },
  { id: 'o5', brand: 'Tower of London dum', city: 'London', topic: 'Visit', pct: 12, text: 'Entry with a Yeoman Warder tour, 12% off' },
  { id: 'o6', brand: 'Basement Club dum', city: 'London', topic: 'Clubs', pct: 25, text: 'Free entry before midnight and 25% off drinks' },
  { id: 'o7', brand: 'Palladium Circle Bar dum', city: 'London', topic: 'Theatres', pct: 15, text: '15% off interval drinks and programmes' },
  { id: 'o8', brand: 'Roundhouse Sessions dum', city: 'London', topic: 'Concerts', pct: 10, text: '10% off selected small-venue concerts' },
  { id: 'o9', brand: 'PureGym Soho dum', city: 'London', topic: 'Gyms', pct: 30, text: 'First month 30% off, no joining fee' },
  { id: 'o10', brand: 'Glow Clinic dum', city: 'London', topic: 'Beauty clinics', pct: 20, text: '20% off a first treatment' },
  { id: 'o11', brand: 'Bath House Spa dum', city: 'London', topic: 'Spas', pct: 25, text: 'Day pass, 25% off midweek' },
  { id: 'o12', brand: 'Le Petit Zinc dum', city: 'Paris', topic: 'Eat', pct: 20, text: '20% off dinner near Bercy' },
  { id: 'o13', brand: 'Hotel Bercy dum', city: 'Paris', topic: 'Stay', pct: 18, text: '18% off, free late checkout' },
  { id: 'o14', brand: 'Moulin Nuit dum', city: 'Paris', topic: 'Clubs', pct: 15, text: 'Skip the queue and 15% off' },
  { id: 'o15', brand: 'Café Atrium dum', city: 'Brussels', topic: 'Eat', pct: 10, text: '10% off lunch near the stadium' },
  { id: 'o16', brand: 'Grand Place Tours dum', city: 'Brussels', topic: 'Visit', pct: 20, text: '20% off a guided walk' },
  { id: 'o17', brand: 'Northern Quarter Kitchen dum', city: 'Manchester', topic: 'Eat', pct: 25, text: '25% off sharing plates' },
  { id: 'o18', brand: 'Solent Harbour Hotel dum', city: 'Solent', topic: 'Stay', pct: 22, text: '22% off for Yacht Week guests' },
];
const CITIES = ['All', 'London', 'Paris', 'Brussels', 'Manchester', 'Solent'];
const TOPICS = ['All', 'Eat', 'Visit', 'Clubs', 'Theatres', 'Concerts', 'Gyms', 'Beauty clinics', 'Spas', 'Stay'];
const MINS = [0, 10, 20, 30];
export const cityOfEvent = (place: string) => (CITIES.includes(place) ? place : place === 'Werchter' ? 'Brussels' : 'All');

function Chips({ items, value, onPick, fmt }: { items: any[]; value: any; onPick: (v: any) => void; fmt?: (v: any) => string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 6 }}>
      {items.map((x) => (
        <Pressable key={String(x)} style={[s.chip, value === x && s.chipOn]} onPress={() => onPick(x)}><Text style={s.chipT}>{fmt ? fmt(x) : x}</Text></Pressable>
      ))}
    </ScrollView>
  );
}

// The member pass: a QR and a short code that change every 30 seconds dum, shown at the partner to claim an offer.
function Pass({ onClose }: { onClose: () => void }) {
  const [n, setN] = useState(() => Math.floor(Date.now() / 30000));
  useEffect(() => { const id = setInterval(() => setN(Math.floor(Date.now() / 30000)), 1000); return () => clearInterval(id); }, []);
  const code = useMemo(() => { let h = n * 2654435761 % 4294967296; let o = ''; const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (let i = 0; i < 6; i++) { o += A[h % A.length]; h = Math.floor(h / A.length) + 7919 * (i + 1); } return o; }, [n]);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.mWrap}>
        <View style={s.mCard}>
          <Text style={s.t}>Your Hartlanes member pass</Text>
          <Text style={s.sub}>Show this at the partner to claim a saved offer. The code changes every 30 seconds.</Text>
          <View style={{ marginVertical: 14 }}><QR id={'pass' + n} /></View>
          <Text style={s.code}>{code}</Text>
          <Text style={s.note}>❔ dum pass. The real one is made for your account and checked by the partner.</Text>
          <Pressable style={s.big} onPress={onClose}><Text style={s.bigT}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function Explore({ initial, saved, onToggle, onClose }: { initial?: { city?: string; topic?: string }; saved: string[]; onToggle: (id: string) => void; onClose: () => void }) {
  const [city, setCity] = useState(initial && initial.city ? initial.city : 'All');
  const [topic, setTopic] = useState(initial && initial.topic ? initial.topic : 'All');
  const [min, setMin] = useState(0);
  const [pass, setPass] = useState(false);
  const list = OFFERS.filter((o) => (city === 'All' || o.city === city) && (topic === 'All' || o.topic === topic) && o.pct >= min).sort((a, b) => b.pct - a.pct);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        <View style={s.head}>
          <Text style={[s.t, { flex: 1 }]}>Explore offers</Text>
          <Pressable style={s.passBtn} onPress={() => setPass(true)}><Text style={s.passT}>My pass</Text></Pressable>
          <Pressable onPress={onClose} hitSlop={16} style={s.x}><Text style={s.xT}>✕</Text></Pressable>
        </View>
        <Text style={s.sub}>Member offers from our partners. Anyone can be a member, you do not need a ticket. Save an offer to hear about it in your digest.</Text>
        <Text style={s.lab}>City</Text>
        <Chips items={CITIES} value={city} onPick={setCity} />
        <Text style={s.lab}>Topic</Text>
        <Chips items={TOPICS} value={topic} onPick={setTopic} />
        <Text style={s.lab}>Discount</Text>
        <Chips items={MINS} value={min} onPick={setMin} fmt={(v) => (v ? `${v}% or more` : 'Any')} />
        <ScrollView style={{ flex: 1, marginTop: 4 }}>
          {list.length === 0 && <Text style={s.sub}>No offers match these filters yet.</Text>}
          {list.map((o) => (
            <View key={o.id} style={s.row}>
              <View style={s.pct}><Text style={s.pctT}>{o.pct}%</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{o.brand}</Text>
                <Text style={s.sub}>{o.topic} · {o.city}</Text>
                <Text style={s.sub}>{o.text}</Text>
              </View>
              <Pressable style={[s.save, saved.includes(o.id) && { backgroundColor: '#2f6b47' }]} onPress={() => onToggle(o.id)}><Text style={s.chipT}>{saved.includes(o.id) ? '★ Saved' : '☆ Save'}</Text></Pressable>
            </View>
          ))}
          <Text style={s.note}>❔ dum offers. Real offers come from verified partners, and you claim one by showing your pass.</Text>
        </ScrollView>
      </View>
      {pass && <Pass onClose={() => setPass(false)} />}
    </Modal>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#26272b', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  t: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  lab: { color: '#ffb4a8', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 10, marginBottom: 4 },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  chipOn: { backgroundColor: '#c93b3b' },
  chipT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  x: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  xT: { color: '#fff', fontSize: 16, fontWeight: '700' },
  passBtn: { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,201,191,0.7)', alignItems: 'center', justifyContent: 'center' },
  passT: { color: '#ffc9bf', fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  pct: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  pctT: { color: '#fff', fontSize: 14, fontWeight: '800' },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  save: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  note: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 10 },
  mWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 },
  mCard: { backgroundColor: '#26272b', borderRadius: 18, padding: 18, alignItems: 'center' },
  code: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: 6 },
  big: { height: 40, borderRadius: 20, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', marginTop: 14 },
  bigT: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

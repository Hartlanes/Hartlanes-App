import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Linking, AppState, Modal, ScrollView } from 'react-native';
import { EventItem, getProfile, usersAt, markerOf, PROFILES, Profile } from './data';

// Everything priced "dum" is dummy data. Real prices come once each provider is connected.
export type Option = { name: string; short?: string; url: string; price: string; note: string };
export type Sec = 'Stay' | 'Train' | 'Fly' | 'Car';
export type TripData = Partial<Record<Sec, Option>> & { eat: string[]; visit: string[]; notes: Record<string, string> };
export type Card = { kind: string; title: string; lines: string[]; total?: number; unit?: string; ins: string[]; allowSplit?: boolean };
export type Msg = { id: number; who: string; t?: string; card?: Card };
export type TicketApi = {
  get: (id: string) => string | undefined;
  buy: (ev: EventItem, o: Option) => void;
  demoBought: (ev: EventItem, o: Option) => void;
  openWallet: (id: string) => void;
  trip: (id: string) => TripData;
  setTrip: (id: string, fn: (t: TripData) => TripData) => void;
  chat: (id: string) => Msg[];
  setChat: (id: string, fn: (m: Msg[]) => Msg[]) => void;
  leave: (id: string) => void;
};

export const isTicketable = (ev: EventItem) => ev.status === 'upcoming';
export const startLine = (ev: EventItem) => `Start ${ev.time || '19:30'}`;
// "U2 Tottenham 18 Jun 27'": the artist or event, one place word, and a short date.
export const shortDate = (d: string) => d.replace(/(\d{4})$/, (y) => y.slice(2) + "'");
export const tripTitle = (ev: EventItem) => {
  const tag = ev.tag || ev.place.split(',')[0];
  return [ev.title, tag, shortDate(ev.dateLabel)].filter(Boolean).join(' ');
};
export const emptyTrip = (): TripData => ({ eat: [], visit: [], notes: {} });
let counter = 1;
export const uid = () => Date.now() * 100 + (counter++ % 100);
export const seedChat = (title: string): Msg[] => [
  { id: 1, who: 'Sam', t: `Who's in for ${title}?` },
  { id: 2, who: 'Kofi', t: "I'm in. Meet by the entrance?" },
  { id: 3, who: 'Jane', t: 'I can get the tickets for everyone.' },
  { id: 4, who: 'Sam', t: 'Brilliant, thank you!' },
  { id: 5, who: 'Kofi', t: 'Train in the morning?' },
  { id: 6, who: 'Mia', t: 'Which entrance do we use?' },
  { id: 7, who: 'Ravi', t: 'I wrote up the last U2 night if you want to read it.' },
  { id: 8, who: 'Mia', t: 'Meet at 5 outside the station?' },
];

export const TICKETS: Option[] = [
  { name: 'Ticketmaster UK', short: 'Ticketmaster', url: 'https://www.ticketmaster.co.uk', price: '£150dum', note: 'Standing, general entry dum' },
  { name: 'Eventim UK', short: 'Eventim', url: 'https://www.eventim.co.uk', price: '£165dum', note: 'Standing, near the stage dum' },
  { name: 'See Tickets', short: 'See Tickets', url: 'https://www.seetickets.com', price: '£140dum', note: 'Seated, upper tier dum' },
  { name: 'Dice', url: 'https://dice.fm', price: '£130dum', note: 'Standing, general entry dum' },
  { name: 'Skiddle', url: 'https://www.skiddle.com', price: '£155dum', note: 'Seated, lower tier dum' },
];
const STAY: Option[] = [
  { name: 'Booking.com', url: 'https://www.booking.com', price: '£189dum / night', note: 'Hotel, 0.4 mi from the venue dum' },
  { name: 'Vrbo', url: 'https://www.vrbo.com', price: '£240dum / night', note: 'Group flat, sleeps 6 dum' },
  { name: 'Airbnb', url: 'https://www.airbnb.co.uk', price: '£165dum / night', note: 'Entire flat, 2 beds dum' },
];
const TRAIN: Option[] = [
  { name: 'Trainline', url: 'https://www.thetrainline.com', price: '£18dum', note: 'To the nearest station, about 25 min dum' },
  { name: 'Omio', url: 'https://www.omio.co.uk', price: '£21dum', note: 'Train and coach options dum' },
];
const FLY: Option[] = [
  { name: 'Skyscanner', url: 'https://www.skyscanner.net', price: 'from £64dum return', note: 'Compare flights dum' },
];
const CAR: Option[] = [
  { name: 'Sixt', url: 'https://www.sixt.co.uk', price: '£58dum / day', note: 'Compact, pick up nearby dum' },
  { name: 'Avis', url: 'https://www.avis.co.uk', price: '£62dum / day', note: 'Compact, pick up nearby dum' },
  { name: 'Hertz', url: 'https://www.hertz.co.uk', price: '£60dum / day', note: 'Compact, pick up nearby dum' },
];

const open = (url: string) => { Linking.openURL(url).catch(() => {}); };
const parsePrice = (p: string) => { const m = /£\s?(\d+(?:\.\d+)?)/.exec(p); return m ? parseFloat(m[1]) : 0; };

function rnd(seed: number) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// Sample plan progress for a friend (dum): the share of their wallet bookings that are filled in. Shown only as a percentage, green from 50.
let pokeSeen = false;
export function planOf(userId: string, eventId: string) {
  let h = 0;
  const k = userId + eventId;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 9973;
  return { pct: 20 + Math.floor(rnd(h + 3) * 76) };
}

// ---- Group chat commands: @stay @train @fly @car @eat @split ----
// The cost split is kept for much later, once every field is in place (runCommand still knows @split).
const SPLIT_ON = false;
export const CMDS = ['@stay', '@train', '@fly', '@car', '@eat', '@visit'];
const GERUND: Record<string, string> = { Stay: 'staying info', Train: 'train info', Fly: 'flying info', Car: 'driving info' };

export function runCommand(cmd: string, ev: EventItem, api: TicketApi): Msg {
  const tr = api.trip(ev.id);
  const secs: Record<string, Sec> = { '@stay': 'Stay', '@train': 'Train', '@fly': 'Fly', '@car': 'Car' };
  const sec = secs[cmd];
  if (sec) {
    const o = tr[sec];
    if (!o) return { id: uid(), who: 'Hartlanes', t: `You have not added ${sec.toLowerCase()} yet. Add it in your Wallet, then type ${cmd} again.` };
    const unit = sec === 'Stay' ? ' per night' : sec === 'Car' ? ' per day' : '';
    return { id: uid(), who: 'You', card: { kind: sec, title: `You shared ${GERUND[sec]}: ${o.name}`, lines: [o.note, o.price].filter(Boolean), total: parsePrice(o.price), unit, ins: ['You'] } };
  }
  if (cmd === '@eat' || cmd === '@visit') {
    const eat = cmd === '@eat';
    const list = eat ? tr.eat : tr.visit;
    if (!list.length) return { id: uid(), who: 'Hartlanes', t: `Your ${eat ? 'Eat' : 'Visit'} list is empty. Add places in your Wallet, then type ${cmd} again.` };
    return { id: uid(), who: 'You', card: { kind: eat ? 'Eat' : 'Visit', title: `You shared ${eat ? 'eating' : 'visiting'} info`, lines: list, ins: ['You'] } };
  }
  // @split: everything you have booked, one ticket, one night, one day of car.
  const prov = api.get(ev.id);
  const tk = TICKETS.find((o) => o.name === prov);
  const items: { label: string; price: string }[] = [];
  if (tk) items.push({ label: `Ticket (${tk.name})`, price: tk.price });
  (['Stay', 'Train', 'Fly', 'Car'] as Sec[]).forEach((k) => { const o = tr[k]; if (o) items.push({ label: `${k} (${o.name})`, price: o.price }); });
  if (!items.length) return { id: uid(), who: 'Hartlanes', t: 'Nothing booked yet, so there is nothing to split.' };
  const total = items.reduce((a, b) => a + parsePrice(b.price), 0);
  return { id: uid(), who: 'You', card: { kind: 'Split', title: 'Split the trip', lines: [...items.map((i) => `${i.label}: ${i.price}`), 'Stay counted for 1 night, car for 1 day'], total, unit: '', ins: ['You'] } };
}

// Markers before a name: ● friend, ○ friend of a friend, ▫ chronicler who is a friend, sepia ▪ chronicler who is not.
// Hartlanes itself writes in italics, because those are automated messages.
const Who = ({ who }: { who: string }) => {
  if (who === 'Hartlanes') return <Text style={s.sys}>Hartlanes: </Text>;
  const m = markerOf(who);
  return <Text style={s.bold}>{m ? <Text style={{ color: m.color }}>{m.ch} </Text> : null}{who}: </Text>;
};
export function ChatLine({ m, onToggle, compact }: { m: Msg; onToggle: (id: number, who: string) => void; compact?: boolean }) {
  // Messages from Hartlanes itself are only for the person who typed the command, so the short preview never shows them.
  if (m.who === 'Hartlanes') {
    if (compact) return null;
    // Slanted by a skew, because some phones have no italic cut of their font and show the text upright.
    return <View style={s.sysBox}><Text style={s.sysMsg}>Hartlanes: {m.t}</Text></View>;
  }
  if (!m.card) return <Text style={s.msg} numberOfLines={compact ? 2 : undefined}><Who who={m.who} />{m.t}</Text>;
  const c = m.card;
  if (compact) return <Text style={s.msg} numberOfLines={2}>{c.title}</Text>;
  const mine = m.who === 'You';
  return (
    <View style={s.cc}>
      <Text style={s.ccT}>{c.title}</Text>
      {c.lines.map((l, i) => <Text key={i} style={s.sub}>{l}</Text>)}
      {mine ? (
        <View style={{ marginTop: 8 }}>
          <Pressable style={[s.chipP, c.allowSplit && { backgroundColor: '#2f6b47' }, { alignSelf: 'flex-start' }]} onPress={() => onToggle(m.id, 'allow')}>
            <Text style={s.ghostT}>{c.allowSplit ? '✓ Others can ask to split' : 'Allow others to split with you'}</Text>
          </Pressable>
          {c.allowSplit && <Text style={s.note}>Friends see a button on this card: ask Ade to split this</Text>}
        </View>
      ) : (
        <Pressable disabled={!c.allowSplit} style={[s.chipP, { alignSelf: 'flex-start', marginTop: 8, opacity: c.allowSplit ? 1 : 0.4 }]} onPress={() => {}}>
          <Text style={s.ghostT}>ask {m.who.split(' ')[0]} to split this</Text>
        </Pressable>
      )}
    </View>
  );
}

// A stand-in QR code, so the layout can be judged. The real one is the user's own ticket.
export function QR({ id }: { id: string }) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  const N = 17;
  const C = 7;
  const rows: React.ReactNode[] = [];
  for (let y = 0; y < N; y++) {
    const cells: React.ReactNode[] = [];
    for (let x = 0; x < N; x++) {
      const finder = (x < 5 && y < 5) || (x >= N - 5 && y < 5) || (x < 5 && y >= N - 5);
      let on: boolean;
      if (finder) {
        const lx = x < 5 ? x : x - (N - 5);
        const ly = y < 5 ? y : y - (N - 5);
        on = lx === 0 || lx === 4 || ly === 0 || ly === 4 || (lx === 2 && ly === 2);
      } else on = rnd(h + x * 17 + y * 3.1) > 0.5;
      cells.push(<View key={x} style={{ width: C, height: C, backgroundColor: on ? '#000' : '#fff' }} />);
    }
    rows.push(<View key={y} style={{ flexDirection: 'row' }}>{cells}</View>);
  }
  return <View style={{ backgroundColor: '#fff', padding: 8, alignSelf: 'center', borderRadius: 6 }}>{rows}</View>;
}

// The five ticket options side by side, shown on the event's Tickets bubble.
export function TicketOptions({ ev, venueName, api }: { ev: EventItem; venueName: string; api: TicketApi }) {
  const have = api.get(ev.id);
  const [pick, setPick] = useState(false);
  return (
    <View>
      <Text style={s.t}>{ev.title} · {ev.dateLabel}</Text>
      <Text style={s.sub}>{venueName} · {startLine(ev)}</Text>
      {have ? (
        <View style={{ marginTop: 10 }}>
          <Text style={s.ok}>✓ You have a ticket from {have}</Text>
          <Pressable style={s.big} onPress={() => api.openWallet(ev.id)}><Text style={s.bigT}>Open ticket and trip</Text></Pressable>
        </View>
      ) : (
        <View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            {TICKETS.map((o, i) => (
              <Pressable key={o.name} style={[s.rect, { marginLeft: i ? 4 : 0 }]} onPress={() => api.buy(ev, o)}>
                <Text style={s.rName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{o.short || o.name}</Text>
                <Text style={s.rPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{o.price}</Text>
                <Text style={s.rNote} numberOfLines={4}>{o.note}</Text>
                <View style={s.rBuy}><Text style={s.buyT}>Buy ›</Text></View>
              </Pressable>
            ))}
          </View>
          <Text style={s.note}>❔ Dummy data (dum) until each provider is connected. Buy opens the provider's own site. When you come back, the app asks if you bought.</Text>
          <Pressable style={s.owned} onPress={() => setPick((p) => !p)}><Text style={s.ownedT}>I already purchased a ticket. Let's add it</Text></Pressable>
          {pick && (
            <View style={{ marginTop: 8 }}>
              <Text style={s.lab}>Where did you buy it?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {[...TICKETS.map((o) => o.name), 'Other'].map((n) => (
                  <Pressable key={n} style={s.chipP} onPress={() => { setPick(false); api.demoBought(ev, { name: n } as Option); }}><Text style={s.ghostT}>{n}</Text></Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function NoteBox({ label, hint, value, onSave }: { label: string; hint: string; value: string; onSave: (t: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={s.lab}>{label}</Text>
      <TextInput value={v} onChangeText={setV} onBlur={() => onSave(v)} onEndEditing={() => onSave(v)} placeholder={hint} placeholderTextColor="#777" multiline style={s.input} />
    </View>
  );
}

// The form for writing a booking down: provider, price, and any details (address, reference, who is coming).
function BookForm({ title, options, initial, onSave, onCancel, onRemove }: { title: string; options: Option[]; initial?: Option; onSave: (o: Option) => void; onCancel: () => void; onRemove?: () => void }) {
  const [name, setName] = useState(initial ? initial.name : '');
  const [price, setPrice] = useState(initial ? initial.price : '');
  const [det, setDet] = useState(initial ? initial.note : '');
  const save = () => {
    const n = name.trim();
    if (!n) return;
    const known = options.find((x) => x.name.toLowerCase() === n.toLowerCase());
    onSave({ name: known ? known.name : n, url: known ? known.url : (initial ? initial.url : ''), price: price.trim(), note: det.trim() });
  };
  return (
    <View style={s.form}>
      <Text style={s.lab}>Where did you book {title.toLowerCase()}?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[...options.map((o) => o.name), 'Other'].map((n) => (
          <Pressable key={n} style={[s.chipP, name === n && { backgroundColor: '#c93b3b' }]} onPress={() => setName(n === 'Other' ? '' : n)}><Text style={s.ghostT}>{n}</Text></Pressable>
        ))}
      </View>
      <TextInput value={name} onChangeText={setName} placeholder="Provider or place" placeholderTextColor="#777" style={[s.input, { minHeight: 40, marginTop: 4 }]} />
      <TextInput value={price} onChangeText={setPrice} placeholder="Price (optional)" placeholderTextColor="#777" style={[s.input, { minHeight: 40, marginTop: 6 }]} />
      <TextInput value={det} onChangeText={setDet} placeholder="Details: address, dates, booking reference, who is with you" placeholderTextColor="#777" multiline style={[s.input, { marginTop: 6 }]} />
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <Pressable style={s.addBtn} onPress={save}><Text style={s.buyT}>Save</Text></Pressable>
        <Pressable style={[s.addBtn, { backgroundColor: '#3b3c42' }]} onPress={onCancel}><Text style={s.buyT}>Cancel</Text></Pressable>
        {onRemove && <Pressable style={[s.addBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(238,110,101,0.7)' }]} onPress={onRemove}><Text style={[s.buyT, { color: '#ffb4a8' }]}>Remove reservation</Text></Pressable>}
      </View>
    </View>
  );
}

// Finds one person by their exact handle. Nothing shows until the whole handle has been typed.
const userByHandle = (h: string): Profile | undefined => {
  const n = h.trim().replace(/^@/, '').toLowerCase();
  return n ? PROFILES.find((p) => p.kind === 'user' && p.id !== 'you' && !!p.username && p.username.toLowerCase() === n) : undefined;
};

// Pop-up used for splitting a cost (split) and for inviting someone to a place they will also have in their wallet (invite).
export function PeopleModal({ mode, title, price, onClose, onSend }: { mode: 'split' | 'invite'; title: string; price?: string; onClose: () => void; onSend: (handles: string[], price: string) => void }) {
  const [h, setH] = useState('');
  const [people, setPeople] = useState<Profile[]>([]);
  const [pr, setPr] = useState(price ? String(parsePrice(price) || '') : '');
  const found = userByHandle(h);
  const add = () => { if (found && !people.some((p) => p.id === found.id)) { setPeople((x) => [...x, found]); setH(''); } };
  const total = parseFloat(pr) || 0;
  const each = total ? (total / (people.length + 1)).toFixed(2) : '';
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.mWrap}>
        <View style={s.mCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[s.t, { flex: 1, fontSize: 16 }]} numberOfLines={2}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={s.introX}><Text style={s.chipT}>✕</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
            {mode === 'split' && (
              <View style={{ marginTop: 10 }}>
                <Text style={s.lab}>Total to split (£)</Text>
                <TextInput value={pr} onChangeText={setPr} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#777" style={[s.input, { minHeight: 40 }]} />
              </View>
            )}
            <Text style={[s.lab, { marginTop: 10 }]}>Add a friend by their exact handle</Text>
            <View style={{ flexDirection: 'row' }}>
              <TextInput value={h} onChangeText={setH} autoCapitalize="none" autoCorrect={false} placeholder="@handle" placeholderTextColor="#777" style={[s.input, { flex: 1, minHeight: 40 }]} />
            </View>
            {found && (
              <Pressable style={s.found} onPress={add}>
                <Text style={s.foundL}>User</Text>
                <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{found.name}  <Text style={s.sub}>@{found.username}</Text></Text>
                <Text style={s.chipT}>Add +</Text>
              </Pressable>
            )}
            {people.map((p) => (
              <View key={p.id} style={s.found}>
                <Text style={s.foundL}>User</Text>
                <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{p.name}  <Text style={s.sub}>@{p.username}</Text></Text>
                <Pressable onPress={() => setPeople((x) => x.filter((q) => q.id !== p.id))} hitSlop={10}><Text style={s.rm}>✕</Text></Pressable>
              </View>
            ))}
            {mode === 'split' && people.length > 0 && !!each && <Text style={s.split}>£{each} each, {people.length + 1} ways</Text>}
            <Text style={s.note}>{mode === 'split'
              ? 'Each friend gets a request. When they accept, this reservation also appears in their wallet, with their share.'
              : 'Each friend gets an invite. When they accept the tag, it appears in their wallet too. Nothing is split.'}</Text>
          </ScrollView>
          <Pressable style={[s.big, !people.length && { opacity: 0.4 }]} onPress={() => { if (people.length) onSend(people.map((p) => p.username as string), pr); }}>
            <Text style={s.bigT}>{mode === 'split' ? 'Send split request' : 'Send invite'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// One logistics section. Until something is added it shows the options side by side (each opens the provider's own site),
// plus one button for something booked earlier or elsewhere. After that it becomes one tidy row you can edit.
function Section({ title, items, booked, onOpen, onClear, onSplit, splitInfo, form, onForm, onSave, ask, onAskYes, onAskNo, extra }: {
  title: string; items: Option[]; booked?: Option; onOpen: (o: Option) => void; onClear: () => void; onSplit: () => void; splitInfo?: string;
  form: { initial?: Option } | null; onForm: (f: { initial?: Option } | null) => void; onSave: (o: Option) => void;
  ask?: Option; onAskYes: () => void; onAskNo: () => void; extra?: React.ReactNode;
}) {
  const pad = Array.from({ length: Math.max(0, 3 - items.length) });
  const formEl = form ? <BookForm title={title} options={items} initial={form.initial} onSave={onSave} onCancel={() => onForm(null)} onRemove={form.initial && booked ? () => { onClear(); onForm(null); } : undefined} /> : null;
  return (
    <View style={s.sec}>
      <Text style={s.h}>{title}{booked ? '  ✓' : ''}</Text>
      {ask && (
        <View style={s.askCard}>
          <Text style={s.name}>Did you book {title.toLowerCase()} with {ask.name}?</Text>
          <Text style={s.sub}>If yes, write it down here so it stays with your ticket.</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Pressable style={s.addBtn} onPress={onAskYes}><Text style={s.buyT}>Yes, I booked</Text></Pressable>
            <Pressable style={[s.addBtn, { backgroundColor: '#3b3c42' }]} onPress={onAskNo}><Text style={s.buyT}>Not yet</Text></Pressable>
          </View>
        </View>
      )}
      {booked ? (
        form ? formEl : (
          <View style={s.tile}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{booked.name}</Text>
              {!!booked.note && <Text style={s.sub}>{booked.note}</Text>}
              {!!booked.price && <Text style={s.price2}>{booked.price}</Text>}
              {!!splitInfo && <Text style={[s.sub, { color: '#8fd9a8' }]}>{splitInfo}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {!!booked.url && <Pressable style={s.chip} onPress={() => open(booked.url)}><Text style={s.chipT}>Open ›</Text></Pressable>}
              <Pressable style={s.chip} onPress={() => onForm({ initial: booked })}><Text style={s.chipT}>Edit</Text></Pressable>
              <Pressable style={s.chip} onPress={onSplit}><Text style={s.chipT}>Split cost</Text></Pressable>
            </View>
          </View>
        )
      ) : (
        <View>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            {items.map((o, i) => (
              <View key={o.name} style={[s.rectL, { marginLeft: i ? 6 : 0 }]}>
                <Text style={s.rName}>{o.name}</Text>
                <Text style={s.rPrice}>{o.price}</Text>
                <Text style={s.rNote} numberOfLines={4}>{o.note}</Text>
                <Pressable style={[s.chip, { alignSelf: 'stretch', backgroundColor: '#c93b3b' }]} onPress={() => onOpen(o)}><Text style={s.chipT}>Open ›</Text></Pressable>
              </View>
            ))}
            {pad.map((_, i) => <View key={'p' + i} style={{ flex: 1, marginLeft: 6 }} />)}
          </View>
          {form ? formEl : (
            <Pressable style={s.owned} onPress={() => onForm({})}><Text style={s.ownedT}>Already booked earlier or elsewhere? Add it</Text></Pressable>
          )}
        </View>
      )}
      {extra}
    </View>
  );
}

// A list the user fills in by hand (Eat, Visit). Every entry can be edited in place and can be shared with a friend, who gets the same entry in their wallet once they accept.
function ListSection({ title, hint, items, onChange, invites, onInvite }: { title: string; hint: string; items: string[]; onChange: (x: string[]) => void; invites: (i: number) => string; onInvite: (i: number) => void }) {
  const [v, setV] = useState('');
  const add = () => { if (v.trim()) { onChange([...items, v.trim()]); setV(''); } };
  return (
    <View style={s.sec}>
      <Text style={s.h}>{title}</Text>
      {items.map((x, i) => (
        <View key={i} style={s.tileCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput value={x} onChangeText={(tx) => onChange(items.map((y, k) => (k === i ? tx : y)))} style={[s.name, s.edit, { flex: 1 }]} placeholderTextColor="#777" />
            <Pressable style={[s.chip, { marginBottom: 0, marginLeft: 6 }]} onPress={() => onInvite(i)}><Text style={s.chipT}>Invite</Text></Pressable>
            <Pressable onPress={() => onChange(items.filter((_, k) => k !== i))} hitSlop={10}><Text style={s.rm}>✕</Text></Pressable>
          </View>
          {!!invites(i) && <Text style={[s.sub, { color: '#8fd9a8' }]}>{invites(i)}</Text>}
        </View>
      ))}
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TextInput value={v} onChangeText={setV} onSubmitEditing={add} placeholder={hint} placeholderTextColor="#777" style={[s.input, { flex: 1, minHeight: 40 }]} />
        <Pressable style={s.addBtn} onPress={add}><Text style={s.buyT}>Add</Text></Pressable>
      </View>
    </View>
  );
}

function daysTo(ev: EventItem) {
  const k = ev.sortKey;
  const d = new Date(Math.floor(k / 10000), Math.floor((k % 10000) / 100) - 1, k % 100);
  const now = new Date();
  return Math.ceil((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
}

// The ticket page in the Ticket tab: a celebration title, the ticket, then all the logistics for the same event.
export function Wallet({ ev, provider, api, onBack, onSeeEvent }: { ev: EventItem; provider: string; api: TicketApi; onBack: () => void; onSeeEvent: () => void }) {
  const venue = getProfile('venue', ev.venueId);
  const friends = usersAt(ev.id).filter((u) => u.friend);
  const tr = api.trip(ev.id);
  const opt = TICKETS.find((o) => o.name === provider);
  const set = (fn: (t: TripData) => TripData) => api.setTrip(ev.id, fn);
  const [form, setForm] = useState<{ sec: Sec; initial?: Option } | null>(null);
  const [ask, setAsk] = useState<{ sec: Sec; o: Option } | null>(null);
  const [poked, setPoked] = useState<string[]>([]);
  const [pm, setPm] = useState<{ mode: 'split' | 'invite'; key: string; title: string; price?: string } | null>(null);
  const [askShare, setAskShare] = useState(false);
  const [, setIntro] = useState(true);
  const pending = useRef<{ sec: Sec; o: Option } | null>(null);
  // After a visit to a provider's site, ask on return whether they booked, then give them the fields to write it down.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && pending.current) { setAsk(pending.current); pending.current = null; }
    });
    return () => sub.remove();
  }, []);
  const sec4 = (sec: Sec, items: Option[], extra?: React.ReactNode) => (
    <Section title={sec} items={items} booked={tr[sec]} extra={extra}
      onOpen={(o) => { pending.current = { sec, o }; open(o.url); }}
      onClear={() => set((t) => ({ ...t, [sec]: undefined }))}
      onSplit={() => { const o = tr[sec]; if (o) setPm({ mode: 'split', key: 'split:' + sec, title: `Split cost: ${sec} (${o.name})`, price: o.price }); }}
      splitInfo={tr.notes['split:' + sec] || undefined}
      form={form && form.sec === sec ? { initial: form.initial } : null}
      onForm={(f) => setForm(f ? { sec, initial: f.initial } : null)}
      onSave={(o) => { set((t) => ({ ...t, [sec]: o })); setForm(null); setAsk(null); }}
      ask={ask && ask.sec === sec && !tr[sec] ? ask.o : undefined}
      onAskYes={() => { if (ask) { setForm({ sec, initial: { name: ask.o.name, url: ask.o.url, price: ask.o.price, note: '' } }); setAsk(null); } }}
      onAskNo={() => setAsk(null)} />
  );
  const note = (k: string) => (txt: string) => set((t) => ({ ...t, notes: { ...t.notes, [k]: txt } }));
  const days = daysTo(ev);
  return (
    <View>
      <Pressable onPress={onBack} hitSlop={10}><Text style={s.back}>‹ Wallet</Text></Pressable>
      <Text style={s.hero}>{`You're going to ${ev.title}!`}</Text>
      <Text style={s.heroSub}>{ev.dateLabel} · {venue.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        {days > 0 ? <View style={[s.count, { marginTop: 0 }]}><Text style={s.countT}>{days} day{days === 1 ? '' : 's'} to go</Text></View> : <View />}
        <Pressable style={s.seeEv} onPress={onSeeEvent}><Text style={s.seeEvT}>See the event universe ›</Text></Pressable>
      </View>
      <View style={[s.card, { marginTop: 12 }]}>
        <Text style={s.t}>{ev.title}</Text>
        <Text style={s.sub}>{ev.range || ev.dateLabel} · {venue.name}</Text>
        {!!venue.fullAddr && <Text style={s.sub}>{venue.fullAddr}</Text>}
        <Text style={s.sub}>{startLine(ev)} · Zone: {opt ? opt.note : 'Standing dum'}</Text>
        <Text style={s.sub}>Bought from {provider} · {opt ? opt.price : '£150dum'}</Text>
        <View style={{ marginVertical: 10 }}><QR id={ev.id} /></View>
        <Text style={s.note}>❔ dum QR (dum). Your real QR, PDF or screenshot will appear here, big and bright for the door.</Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {opt && <Pressable style={s.chip} onPress={() => open(opt.url)}><Text style={s.chipT}>Open in {provider} ›</Text></Pressable>}
          <View style={[s.chip, { opacity: 0.55, marginLeft: 8 }]}><Text style={s.chipT}>Attach PDF or photo: next build</Text></View>
        </View>
        <NoteBox label="My access details" hint="Paste or type anything: seat, entry gate, codes" value={tr.notes.access || ''} onSave={note('access')} />
      </View>

      {sec4('Stay', STAY)}
      {sec4('Train', TRAIN)}
      {sec4('Fly', FLY)}
      {sec4('Car', CAR, <Text style={s.note}>Parking near the venue is often limited on event days, so check before you drive. A car helps most for the long leg of the trip.</Text>)}
      <ListSection title="Eat" hint="A place you want to eat" items={tr.eat} onChange={(x) => set((t) => ({ ...t, eat: x }))}
        invites={(i) => tr.notes['inv:Eat:' + i] || ''} onInvite={(i) => setPm({ mode: 'invite', key: 'inv:Eat:' + i, title: `Invite to eat: ${tr.eat[i]}` })} />
      <ListSection title="Visit" hint="A place you want to visit" items={tr.visit} onChange={(x) => set((t) => ({ ...t, visit: x }))}
        invites={(i) => tr.notes['inv:Visit:' + i] || ''} onInvite={(i) => setPm({ mode: 'invite', key: 'inv:Visit:' + i, title: `Invite to visit: ${tr.visit[i]}` })} />

      <Text style={[s.note, { marginTop: 14 }]}>In the group chat, type @stay, @train, @fly, @car, @eat or @visit to share your info with others.</Text>
      <NoteBox label="My trip notes" hint="Meeting point, who pays for what, timings" value={tr.notes.trip || ''} onSave={note('trip')} />
      <Text style={[s.note, { marginTop: 10 }]}>All prices, zones and times marked dum are dummy data. Booking links open each provider's own site.</Text>

      <View style={s.divider} />
      <View style={s.sec}>
        <Text style={s.h}>Going with</Text>
        {friends.length === 0 && <Text style={s.sub}>No friends yet.</Text>}
        {friends.map((u, i) => {
          const pl = planOf(u.id, ev.id);
          const green = pl.pct >= 50;
          const done = poked.includes(u.id);
          return (
            <View key={u.id} style={s.fr}>
              <View style={[s.frDot, { backgroundColor: ['#c93b3b', '#d9803a', '#caa63a', '#5aa67a', '#4f86c6'][i % 5] }]}><Text style={s.frDotT}>{u.name[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{u.name}</Text>
              </View>
              <View style={[s.frPct, { backgroundColor: green ? 'rgba(143,217,168,0.2)' : 'rgba(238,110,101,0.2)' }]}><Text style={[s.frPctT, { color: green ? '#8fd9a8' : '#ee6e65' }]}>{pl.pct}%</Text></View>
              <Pressable style={[s.poke, done && s.pokeOn]} onPress={() => { if (!done) setPoked((x) => [...x, u.id]); }} hitSlop={6}>
                <Text style={{ fontSize: 15 }}>{done ? '✓' : '🫧'}</Text>
              </Pressable>
            </View>
          );
        })}
        {!pokeSeen && (
          <View style={s.intro}>
            <Text style={[s.sub, { flex: 1, marginTop: 0 }]}>❔ A poke is a gentle nudge for a friend whose plan is falling behind. They get a soft reminder, and nobody else sees it.</Text>
            <Pressable style={s.introX} onPress={() => { pokeSeen = true; setIntro(false); }} hitSlop={10}><Text style={s.chipT}>✕</Text></Pressable>
          </View>
        )}
        <Pressable style={[s.owned, { marginTop: 10 }]} onPress={() => setAskShare(true)}><Text style={s.ownedT}>+ Ask a friend to join this event</Text></Pressable>
      </View>
      {pm && <PeopleModal mode={pm.mode} title={pm.title} price={pm.price} onClose={() => setPm(null)} onSend={(hs, pr) => { const txt = pm.mode === 'split' ? `Split with ${hs.map((x) => '@' + x).join(', ')}: £${((parseFloat(pr) || 0) / (hs.length + 1)).toFixed(2)} each (request sent, sample)` : `With ${hs.map((x) => '@' + x).join(', ')} (invite sent, sample)`; set((t) => ({ ...t, notes: { ...t.notes, [pm.key]: txt } })); setPm(null); }} />}
      {askShare && <PeopleModal mode="invite" title="Ask a friend to join this event" onClose={() => setAskShare(false)} onSend={() => setAskShare(false)} />}
    </View>
  );
}

const s = StyleSheet.create({
  t: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  price2: { color: '#ffc9bf', fontSize: 13, fontWeight: '700', marginTop: 3 },
  note: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 },
  ok: { color: '#8fd9a8', fontSize: 15, fontWeight: '700' },
  rect: { flex: 1, backgroundColor: '#1f2024', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 5, alignItems: 'center', borderTopWidth: 3, borderTopColor: '#ea5a52' },
  rectL: { flex: 1, backgroundColor: '#1f2024', borderRadius: 10, padding: 8, borderTopWidth: 3, borderTopColor: '#ea5a52' },
  rName: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center', alignSelf: 'stretch' },
  rPrice: { color: '#ffc9bf', fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'center', alignSelf: 'stretch' },
  rNote: { color: 'rgba(255,255,255,0.6)', fontSize: 9.5, marginTop: 4, marginBottom: 6, textAlign: 'center', alignSelf: 'stretch' },
  rBuy: { height: 26, alignSelf: 'stretch', borderRadius: 13, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  buyT: { color: '#fff', fontWeight: '700', fontSize: 12 },
  big: { height: 34, borderRadius: 17, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  bigT: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ghost: { height: 32, borderRadius: 16, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  owned: { height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(238,110,101,0.7)', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ownedT: { color: '#ffb4a8', fontSize: 12.5, fontWeight: '600', letterSpacing: 0.2 },
  form: { backgroundColor: '#1f2024', borderRadius: 12, padding: 12, marginTop: 8 },
  askCard: { backgroundColor: '#1f2024', borderRadius: 12, padding: 12, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#ee6e65' },
  chipP: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 },
  ghostT: { color: '#fff', fontSize: 12, fontWeight: '600' },
  back: { color: '#ffb4a8', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  hero: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 36 },
  heroSub: { color: '#ffc9bf', fontSize: 15, fontWeight: '600', marginTop: 4 },
  count: { alignSelf: 'flex-start', backgroundColor: '#c93b3b', borderRadius: 14, paddingHorizontal: 12, height: 28, justifyContent: 'center', marginTop: 10 },
  countT: { color: '#fff', fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: '#1f2024', borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ea5a52' },
  sec: { marginTop: 16 },
  h: { color: '#ffb4a8', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  tile: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  chip: { height: 26, paddingHorizontal: 11, borderRadius: 13, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  chipOn: { backgroundColor: '#2f6b47' },
  chipT: { color: '#fff', fontSize: 11, fontWeight: '700' },
  lab: { color: '#ffb4a8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  lab2: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 8, marginBottom: 5 },
  input: { backgroundColor: '#15161a', color: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minHeight: 44, textAlignVertical: 'top' },
  addBtn: { height: 34, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  rm: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '700', paddingHorizontal: 6 },
  msg: { color: '#fff', fontSize: 14, marginBottom: 6 },
  bold: { fontWeight: '700', color: '#ffb4a8' },
  sys: { fontStyle: 'italic', color: '#ffb4a8', fontSize: 14 },
  sysBox: { marginBottom: 6, transform: [{ skewX: '-9deg' }], transformOrigin: '0% 100%' },
  sysMsg: { fontStyle: 'italic', fontSize: 14, color: '#ffb4a8' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)', marginTop: 20 },
  seeEv: { height: 28, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,201,191,0.7)', alignItems: 'center', justifyContent: 'center' },
  seeEvT: { color: '#ffc9bf', fontSize: 12, fontWeight: '700' },
  fr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  frDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  frDotT: { color: '#fff', fontSize: 12, fontWeight: '800' },
  frPct: { height: 24, paddingHorizontal: 10, borderRadius: 12, justifyContent: 'center', marginHorizontal: 8 },
  frPctT: { fontSize: 12, fontWeight: '800' },
  poke: { width: 34, height: 28, borderRadius: 14, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center' },
  pokeOn: { backgroundColor: '#2f6b47' },
  intro: { backgroundColor: '#1f2024', borderRadius: 10, padding: 10, marginTop: 6, marginBottom: 4, flexDirection: 'row', alignItems: 'flex-start' },
  introX: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  tileCol: { paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  edit: { paddingVertical: 4, paddingHorizontal: 0 },
  mWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  mCard: { backgroundColor: '#26272b', borderRadius: 16, padding: 16 },
  found: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2024', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10, marginTop: 8 },
  foundL: { color: '#ee6e65', fontSize: 11, fontWeight: '800', width: 38 },
  frLight: { width: 14, height: 14, borderRadius: 7, marginHorizontal: 12 },
  cc: { backgroundColor: '#1f2024', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#ea5a52' },
  ccT: { color: '#fff', fontSize: 15, fontWeight: '700' },
  split: { color: '#8fd9a8', fontSize: 14, fontWeight: '800', marginTop: 8 },
});

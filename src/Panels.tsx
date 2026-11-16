import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Modal, ScrollView, Linking, useWindowDimensions } from 'react-native';
import { useKeyboard } from './useKeyboard';
import { EventItem, getProfile, usersAt, Kind, placeCC, mapsUrl } from './data';
import { TicketApi, TicketOptions, isTicketable, ChatLine, CMDS, runCommand, uid, Msg, PeopleModal } from './Trip';
import { MemoBubble } from './Memorabilia';
import { cityOfEvent } from './Explore';

export type Nav = { openExplore: (o?: { city?: string; topic?: string }) => void; openProfile: (kind: Kind, id: string) => void; isFollowing: (key: string) => boolean; toggleFollow: (key: string) => void; ticket: TicketApi };

export const Row = ({ title, sub, onPress, action }: { title: string; sub?: string; onPress?: () => void; action?: React.ReactNode }) => (
  <Pressable onPress={onPress} style={s.row}>
    <View style={{ flex: 1 }}>
      <Text style={s.rowT}>{title}</Text>
      {!!sub && <Text style={s.rowS}>{sub}</Text>}
    </View>
    {action}
    {onPress && <Text style={s.chev}>›</Text>}
  </Pressable>
);

// The conversation view, shared by the event bubble and the All chats list. Commands: @stay @train @fly @car @eat @visit post a card of what you booked.
// Share chips only show here, in the full conversation. In the full view you can also leave the group, or pick your own entries to delete.
export function FullChat({ ev, api, onClose }: { ev: EventItem; api: TicketApi; onClose: () => void }) {
  const msgs = api.chat(ev.id);
  const [txt, setTxt] = useState('');
  const [del, setDel] = useState(false);
  const [sel, setSel] = useState<number[]>([]);
  const [leaving, setLeaving] = useState(false);
  const kb = useKeyboard();
  const winH = useWindowDimensions().height;
  const [boxH, setBoxH] = useState(0);
  // The popup window may already shrink by itself when the keyboard opens. Only add our own space when it did not, so the field never jumps over the text.
  const shrunk = kb > 0 && boxH > 0 && boxH < winH - kb * 0.6;
  const padB = kb > 0 ? (shrunk ? 12 : kb + 8) : 24;
  const send = (raw: string) => {
    const tt = raw.trim();
    if (!tt) return;
    const cmd = tt.split(/\s+/)[0].toLowerCase();
    if (CMDS.includes(cmd)) api.setChat(ev.id, (x) => [...x, runCommand(cmd, ev, api)]);
    else api.setChat(ev.id, (x) => [...x, { id: uid(), who: 'You', t: tt }]);
    setTxt('');
  };
  const toggle = (id: number, who: string) => api.setChat(ev.id, (x) => x.map((m) => (m.id === id && m.card && who === 'allow' ? { ...m, card: { ...m.card, allowSplit: !m.card.allowSplit } } : m)));
  const mine = (m: Msg) => m.who === 'You';
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }} onLayout={(e) => setBoxH(e.nativeEvent.layout.height)}>
        <View style={[s.full, { paddingBottom: padB }]}>
          <View style={s.fullHead}>
            <Text style={[s.fullT, { flex: 1 }]} numberOfLines={1}>{ev.title} chat</Text>
            <Pressable onPress={() => { setDel((d) => !d); setSel([]); setLeaving(false); }} hitSlop={8} style={s.hBtn}><Text style={s.hBtnT}>{del ? 'Done' : 'Delete'}</Text></Pressable>
            <Pressable onPress={() => { setLeaving((l) => !l); setDel(false); }} hitSlop={8} style={s.hBtn}><Text style={s.hBtnT}>Leave</Text></Pressable>
            <Pressable onPress={onClose} hitSlop={16} style={s.xBtn}><Text style={s.xT}>✕</Text></Pressable>
          </View>
          {leaving && (
            <View style={s.warn}>
              <Text style={s.rowT}>Leave this group?</Text>
              <Text style={s.rowS}>It leaves your All chats list and you stop getting its messages.</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <Pressable style={[s.btn, { marginLeft: 0 }]} onPress={() => { api.leave(ev.id); onClose(); }}><Text style={s.btnT}>Leave group</Text></Pressable>
                <Pressable style={[s.btn, { backgroundColor: '#3b3c42' }]} onPress={() => setLeaving(false)}><Text style={s.btnT}>Stay</Text></Pressable>
              </View>
            </View>
          )}
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {msgs.map((m) => {
              const pickable = del && mine(m);
              const on = sel.includes(m.id);
              return (
                <Pressable key={m.id} disabled={!pickable} onPress={() => setSel((x) => (x.includes(m.id) ? x.filter((k) => k !== m.id) : [...x, m.id]))} style={pickable ? [s.pick, on && s.pickOn] : undefined}>
                  <View style={{ flexDirection: 'row' }}>
                    {pickable && <Text style={s.box}>{on ? '☑' : '☐'}</Text>}
                    <View style={{ flex: 1 }}><ChatLine m={m} onToggle={toggle} /></View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          {del ? (
            <Pressable style={[s.delBtn, !sel.length && { opacity: 0.4 }]} onPress={() => { if (sel.length) { api.setChat(ev.id, (x) => x.filter((m) => !sel.includes(m.id))); setSel([]); } }}>
              <Text style={s.btnT}>{sel.length ? `Delete ${sel.length} selected` : 'Tap your own messages to select them'}</Text>
            </Pressable>
          ) : (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, marginTop: 6 }}>
                {CMDS.map((c) => (
                  <Pressable key={c} style={s.cmd} onPress={() => send(c)}><Text style={s.cmdT}>{c}</Text></Pressable>
                ))}
              </ScrollView>
              <View style={s.inputRow}>
                <TextInput value={txt} onChangeText={setTxt} onSubmitEditing={() => send(txt)} placeholder="Write a message or type @stay" placeholderTextColor="#888" style={s.input} />
                <Pressable style={s.btn} onPress={() => send(txt)}><Text style={s.btnT}>Send</Text></Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// On the event bubble the chat shows only the last three lines, with a plain message field. "See whole convo" opens all of it.
function GroupChat({ ev, api }: { ev: EventItem; api: TicketApi }) {
  const msgs = api.chat(ev.id);
  const [txt, setTxt] = useState('');
  const [full, setFull] = useState(false);
  const send = () => {
    const tt = txt.trim();
    if (!tt) return;
    api.setChat(ev.id, (x) => [...x, { id: uid(), who: 'You', t: tt }]);
    setTxt('');
  };
  return (
    <View>
      {msgs.filter((m) => m.who !== 'Hartlanes').slice(-3).map((m) => (
        <ChatLine key={m.id} m={m} compact onToggle={() => {}} />
      ))}
      <View style={{ alignItems: 'flex-end' }}>
        <Pressable onPress={() => setFull(true)}><Text style={s.more}>See whole convo ›</Text></Pressable>
      </View>
      <View style={s.inputRow}>
        <TextInput value={txt} onChangeText={setTxt} onSubmitEditing={send} placeholder="Write a message" placeholderTextColor="#888" style={s.input} />
        <Pressable style={s.btn} onPress={send}><Text style={s.btnT}>Send</Text></Pressable>
      </View>
      <Text style={s.note}>❔ dum chat, kept while the app is open. Open the whole convo to share bookings with @stay, @train, @fly, @car, @eat or @visit.</Text>
      {full && <FullChat ev={ev} api={api} onClose={() => setFull(false)} />}
    </View>
  );
}

function AskFriend() {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable style={s.askBtn} onPress={() => setOpen(true)}><Text style={s.askBtnT}>+ Ask a friend to join this event</Text></Pressable>
      {open && <PeopleModal mode="invite" title="Ask a friend to join this event" onClose={() => setOpen(false)} onSend={() => setOpen(false)} />}
    </View>
  );
}

export function ElementPanel({ name, ev, nav }: { name: string; ev: EventItem; nav: Nav }) {
  const venue = getProfile('venue', ev.venueId);
  const org = getProfile('organiser', ev.organiserId);
  const going = usersAt(ev.id);
  switch (name) {
    case 'Artists':
      return <View>{ev.artists.map((a, i) => <Row key={i} title={a.name} sub={[a.role, a.time, a.artistId ? 'Open their Timelane' : ''].filter(Boolean).join(' · ')} onPress={a.artistId ? () => nav.openProfile('artist', a.artistId as string) : undefined} />)}{!!ev.note && <Text style={s.note}>{ev.note}</Text>}</View>;
    case 'Venue':
      return (
        <View>
          <Row title={venue.name} sub={venue.bio} onPress={() => nav.openProfile('venue', venue.id)} />
          {!!venue.fullAddr && <Row title="Address" sub={venue.fullAddr} action={<Pressable style={s.lmBtn} onPress={() => Linking.openURL(mapsUrl(venue)).catch(() => {})}><Text style={s.btnT}>Google Maps</Text></Pressable>} />}
          {!!venue.capacity && <Text style={s.fact}>• Capacity {venue.capacity}</Text>}
          {!!venue.fact && <Text style={s.fact}>• {venue.fact}</Text>}
        </View>
      );
    case 'Organiser':
      return (
        <View>
          <Row title={org.name} sub={org.bio} onPress={() => nav.openProfile('organiser', org.id)} />
          {!!org.website && <Text style={s.fact}>• Website: {org.website}</Text>}
        </View>
      );
    case "Who's going":
    case 'Who went': {
      const fr = going.filter((u) => u.friend);
      const pub = going.filter((u) => !u.friend && (u.pub || u.fof));
      const upcoming = ev.status === 'upcoming';
      return (
        <View>
          {fr.length > 0 && <Text style={s.h2}>Friends</Text>}
          {fr.map((u) => <Row key={u.id} title={u.name} sub={`@${u.username} · ${u.bio}`} onPress={() => nav.openProfile('user', u.id)} />)}
          {pub.length > 0 && <Text style={s.h2}>Others {upcoming ? 'going' : 'who went'}, visible to everyone</Text>}
          {pub.map((u) => <Row key={u.id} title={u.name} sub={`@${u.username} · ${u.bio}`} onPress={() => nav.openProfile('user', u.id)} />)}
          {upcoming && <AskFriend />}
          <Text style={s.note}>Only people who chose to be visible are listed beyond your friends.</Text>
        </View>
      );
    }
    case 'Friends':
    case 'Friends that went': {
      const f = going.filter((u) => u.friend);
      return <View>{f.length ? f.map((u) => <Row key={u.id} title={u.name} sub={`@${u.username} · ${u.bio}`} onPress={() => nav.openProfile('user', u.id)} />) : <Text style={s.note}>None of your friends yet.</Text>}</View>;
    }
    case 'Tickets':
      if (isTicketable(ev)) return <TicketOptions ev={ev} venueName={venue.name} api={nav.ticket} />;
      return (
        <View style={s.ticket}>
          <Text style={s.tT}>{ev.title}</Text>
          <Text style={s.tS}>{ev.dateLabel} · {venue.name}</Text>
          <Text style={s.tS}>Section / seat: dum 214 · Row 12 · Seat 9</Text>
          <Text style={s.tS}>Group: you, Sam, Jane</Text>
          <Text style={s.note}>❔ dum ticket. Real tickets will be stored in your wallet here.</Text>
        </View>
      );
    case 'Travel': {
      // Sample offers (dum). Later these come from verified partners, and the price uses where the user is.
      const fare = ({ London: 64, Manchester: 58, Solent: 72, Werchter: 112, Paris: 80 } as Record<string, number>)[ev.place] || 90;
      const sights: Record<string, string> = {
        London: 'Madame Tussauds, London Eye, Tower of London and more (dum)',
        Manchester: 'Northern Quarter, Science and Industry Museum, Old Trafford and more (dum)',
        Solent: 'Spinnaker Tower, Gunwharf Quays, the Isle of Wight ferry and more (dum)',
        Werchter: 'Leuven old town, Grand Place in Brussels and more (dum)',
      };
      const city = cityOfEvent(ev.place);
      return (
        <View>
          <Row title={`Getting to ${placeCC(ev)}`} sub={`Estimated price today: £${fare}dum return by plane`} />
          <Row title="Ticket availability" sub="Low availability on 3 out of 5 providers (dum)" />
          <Row title="Stay" sub="The nearest hotel to the venue has 20% off with code #youtoo (dum)" action={<Pressable style={s.lmBtn} onPress={() => nav.openExplore({ city, topic: 'Stay' })}><Text style={s.btnT}>Explore</Text></Pressable>} />
          <Row title="Eat" sub="5 restaurants nearby have 30% off with code #yewtew (dum)" action={<Pressable style={s.lmBtn} onPress={() => nav.openExplore({ city, topic: 'Eat' })}><Text style={s.btnT}>Explore</Text></Pressable>} />
          <Row title={`Landmarks and things to do in ${ev.place}`} sub={sights[ev.place] || 'Local sights and things to do (dum)'} action={<Pressable style={s.lmBtn} onPress={() => nav.openExplore({ city, topic: 'Visit' })}><Text style={s.btnT}>Explore</Text></Pressable>} />
          <Text style={s.note}>Our partners for this event save a little something for Hartlanes users. Save the offers you like and show your member pass to claim them. You do not need a ticket.</Text>
        </View>
      );
    }
    case 'Group chat':
      return <GroupChat ev={ev} api={nav.ticket} />;
    case 'Memorabilia':
      return <MemoBubble ev={ev} />;
    case 'Reviews':
      return <View><Row title="Sam dum" sub="Unforgettable night, great sound." /><Row title="Mia dum" sub="Queues were long but worth it." /></View>;
    case 'Chat archive':
      return <View><Row title="Group chat from the night" sub="dum: the group chat is kept here after the event." /></View>;
    case 'Store':
      return <View><Row title="Event store" sub="dum: official merchandise and prints would be listed here." /></View>;
    case 'Camping':
      return <View><Row title="Camping" sub="dum: tent pitches and shared camping plans." /></View>;
    default:
      return <Text style={s.note}>dum content.</Text>;
  }
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  rowT: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowS: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  chev: { color: '#ffb4a8', fontSize: 22, marginLeft: 8 },
  note: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 },
  fact: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  msg: { color: '#fff', fontSize: 14, marginBottom: 6 },
  bold: { fontWeight: '700', color: '#ffb4a8' },
  inputRow: { flexDirection: 'row', marginTop: 6 },
  input: { flex: 1, backgroundColor: '#1f2024', color: '#fff', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  btn: { backgroundColor: '#c93b3b', borderRadius: 8, paddingHorizontal: 14, marginLeft: 8, justifyContent: 'center' },
  btnT: { color: '#fff', fontWeight: '700' },
  cmd: { height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#3b3c42', justifyContent: 'center', marginRight: 6 },
  cmdT: { color: '#ffb4a8', fontSize: 12, fontWeight: '700' },
  pill: { height: 26, paddingHorizontal: 12, borderRadius: 13, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  pillOn: { backgroundColor: '#4a4b52' },
  pillT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  xBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center' },
  xT: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hBtn: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  hBtnT: { color: '#ffb4a8', fontSize: 12, fontWeight: '700' },
  warn: { backgroundColor: '#1f2024', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#ee6e65' },
  pick: { borderRadius: 8, paddingHorizontal: 4, marginBottom: 2 },
  pickOn: { backgroundColor: 'rgba(238,110,101,0.18)' },
  box: { color: '#ffb4a8', fontSize: 18, marginRight: 8 },
  delBtn: { height: 44, borderRadius: 22, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  askBtn: { height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(238,110,101,0.7)', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  askBtnT: { color: '#ffb4a8', fontSize: 12.5, fontWeight: '600' },
  lm: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  lmBtn: { height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  more: { color: '#ffb4a8', fontSize: 13, fontWeight: '600', marginTop: 2, marginBottom: 4 },
  full: { flex: 1, backgroundColor: '#26272b', paddingTop: 48, paddingHorizontal: 16 },
  fullHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  fullT: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ticket: { backgroundColor: '#1f2024', borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: '#ea5a52' },
  h2: { color: '#ffb4a8', fontSize: 13, fontWeight: '700', marginTop: 10 },
  tT: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tS: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
});

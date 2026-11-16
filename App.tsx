import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar, AppState, BackHandler, Linking, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Lane } from './src/Lane';
import { Galaxy } from './src/Galaxy';
import { ProfileHome, ProfileView } from './src/Profile';
import { TopBar, BackBtn } from './src/Chrome';
import { Menu, Search, Stats, AddPast, MenuItem } from './src/Overlays';
import { Explore, OFFERS } from './src/Explore';
import { useKeyboard } from './src/useKeyboard';
import { DragSheet } from './src/Sheet';
import { Tile as MemoTile, mediaIds, mediaOf, removeMedia, KINDS } from './src/Memorabilia';
import { COLORS } from './src/layout';
import { EVENTS, EventItem, Kind, getProfile, getEvent, eventsOfProfile, profilesOf, DIGEST, STAY_IDEAS, venueShort, profileStats, statsFor } from './src/data';
import { s as ps, Row, FullChat } from './src/Panels';
import { TicketApi, Wallet, isTicketable, TripData, Msg, emptyTrip, seedChat, tripTitle } from './src/Trip';

type Screen = { t: 'lane'; kind: Kind; id: string } | { t: 'event'; ev: EventItem } | { t: 'home' };
type Section = null | 'Tickets' | 'Friends' | 'Updates' | 'Saved' | 'Following' | 'Chats' | 'Settings' | 'Archive' | 'Media';
const TITLES: Record<string, string> = { Tickets: 'Wallet', Updates: 'Updates and your curated digest', Chats: 'All chats', Saved: 'Saved', Following: 'Following', Settings: 'Digest and events setup', Archive: 'Updates archive', Media: 'Manage media' };
// Events can notify from 48 hours. Everything else goes to the digest and is never faster than 7 days.
const FREQS = ['48 hours', '7 days', '10 days', '14 days', 'Monthly'];
const FREQS_SLOW = ['7 days', '10 days', '14 days', 'Monthly'];

// A small boxed section, used for shortcuts that are not plain list rows (Following, Saved, All chats...).
function Tile({ icon, title, sub, onPress }: { icon: string; title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <View style={styles.tileIc}><Text style={{ fontSize: 16 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={ps.rowT}>{title}</Text>
        {!!sub && <Text style={ps.rowS}>{sub}</Text>}
      </View>
      <Text style={ps.chev}>›</Text>
    </Pressable>
  );
}
const Head = ({ children }: { children: string }) => <Text style={styles.head}>{children}</Text>;
const BASE_CHATS = ['u2-spurs-2027', 'cinderella-palladium'];

const KIND_LABEL: Record<Kind, string> = { user: 'User', venue: 'Venue', organiser: 'Organiser', artist: 'Artist' };

function labelOf(s: Screen) {
  if (s.t === 'event') return s.ev.title;
  if (s.t === 'home') return 'my profile';
  return `${getProfile(s.kind, s.id).name}'s Timelane`;
}

class Boundary extends React.Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 14 }}>Something went wrong.</Text>
          <Pressable style={styles.follow2} onPress={() => this.setState({ err: false })}><Text style={styles.followT}>Reload</Text></Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function Main() {
  const [stack, setStack] = useState<Screen[]>([{ t: 'home' }]);
  const [section, setSection] = useState<Section>(null);
  const [following, setFollowing] = useState<string[]>(['user:jane', 'user:sam', 'user:mia', 'user:ravi', 'artist:u2', 'organiser:live-nation']);
  // Events that are on your Timelane: going, tickets bought, or attended. Seeded with three to test adding and removing.
  const [mine, setMine] = useState<string[]>(['glastonbury-2019', 'u2-spurs-2027', 'cinderella-palladium']);
  const [saved, setSaved] = useState<string[]>([]);
  // Events saved for later (past or coming up), offers saved from Explore, updates marked as read, and digest pace per item.
  const [later, setLater] = useState<string[]>([]);
  const [offers, setOffers] = useState<string[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [freq, setFreq] = useState<Record<string, string>>({});
  const [explore, setExplore] = useState<{ city?: string; topic?: string } | null>(null);
  const win = useWindowDimensions();
  // Tickets bought (event id -> provider name). A bought ticket opens the ticket-and-trip page in the Tickets tab.
  const [tickets, setTickets] = useState<Record<string, string>>({});
  const [trips, setTrips] = useState<Record<string, TripData>>({});
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [walletId, setWalletId] = useState<string | null>(null);
  // Chats the user has left, and the chat open from the All chats list.
  const [left, setLeft] = useState<string[]>([]);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sq, setSq] = useState('');
  const [mTab, setMTab] = useState<'all' | 'photo' | 'video' | 'nft'>('all');
  const [, setMTick] = useState(0);
  const closeSearch = () => { setSearching(false); setSq(''); };
  const [stats, setStats] = useState(false);
  const [pStats, setPStats] = useState(false);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState<EventItem[]>([]);
  const [ask, setAsk] = useState<{ id: string; provider: string } | null>(null);
  const pending = useRef<{ id: string; provider: string } | null>(null);
  const kb = useKeyboard();
  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, id: string) => set((x) => (x.includes(id) ? x.filter((k) => k !== id) : [...x, id]));
  const top = stack[stack.length - 1];
  const prev = stack.length > 1 ? stack[stack.length - 2] : null;

  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      setActive(st === 'active');
      // Back from the ticket shop: ask whether they bought.
      if (st === 'active' && pending.current) { setAsk(pending.current); pending.current = null; }
    });
    return () => sub.remove();
  }, []);
  useEffect(() => { if (!section) setWalletId(null); }, [section]);
  // Stable callbacks, so opening a popup does not make the Timelane redraw all its bubbles.
  const push = useCallback((s: Screen) => { setSection(null); setStack((st) => [...st, s]); }, []);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const openProfile = useCallback((kind: Kind, id: string) => push({ t: 'lane', kind, id }), [push]);
  const openEvent = useCallback((ev: EventItem) => push({ t: 'event', ev }), [push]);
  const openSection = useCallback((x: 'Saved' | 'Following') => setSection(x), []);
  const goHome = () => { setSection(null); setStack([{ t: 'home' }]); };
  const paused = !!section || !active || !!ask || menu || searching || stats || pStats || adding || !!explore;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (adding) { setAdding(false); return true; }
      if (searching) { closeSearch(); return true; }
      if (menu) { setMenu(false); return true; }
      if (stats) { setStats(false); return true; }
      if (pStats) { setPStats(false); return true; }
      if (explore) { setExplore(null); return true; }
      if (ask) { setAsk(null); return true; }
      if (section && walletId) { setWalletId(null); return true; }
      if (section) { setSection(null); return true; }
      if (stack.length > 1) { setStack((st) => st.slice(0, -1)); return true; }
      return false;
    });
    return () => sub.remove();
  }, [section, stack.length, walletId, ask, menu, searching, stats, pStats, adding, explore]);
  const toggleFollow = (key: string) => setFollowing((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
  const ticketApi: TicketApi = {
    get: (id) => tickets[id],
    buy: (ev, o) => { pending.current = { id: ev.id, provider: o.name }; Linking.openURL(o.url).catch(() => { pending.current = null; }); },
    demoBought: (ev, o) => { setTickets((t) => ({ ...t, [ev.id]: o.name })); setMine((m) => (m.includes(ev.id) ? m : [...m, ev.id])); },
    openWallet: (id) => { setSection('Tickets'); setWalletId(id); },
    trip: (id) => trips[id] || emptyTrip(),
    setTrip: (id, fn) => setTrips((t) => ({ ...t, [id]: fn(t[id] || emptyTrip()) })),
    chat: (id) => chats[id] || seedChat(getEvent(id).title),
    setChat: (id, fn) => setChats((c) => ({ ...c, [id]: fn(c[id] || seedChat(getEvent(id).title)) })),
    leave: (id) => setLeft((l) => (l.includes(id) ? l : [...l, id])),
  };
  const nav = { openExplore: (o?: { city?: string; topic?: string }) => setExplore(o || {}), openProfile, isFollowing: (k: string) => following.includes(k), toggleFollow, ticket: ticketApi };

  const profile = top.t === 'lane' ? getProfile(top.kind, top.id) : null;
  const homeEvents = useMemo(() => [...eventsOfProfile(getProfile('user', 'you'), mine), ...custom].sort((a, b) => b.sortKey - a.sortKey), [mine, custom]);
  const events = useMemo(() => (profile ? eventsOfProfile(profile, mine) : []), [profile && profile.id, profile && profile.kind, mine]);
  const upcoming = EVENTS.filter((e) => e.status === 'upcoming');
  // Every chat the user takes part in, most recent first. Chats with no new message yet keep event order.
  const chatList = useMemo(() => {
    const ids = Array.from(new Set([...BASE_CHATS, ...mine, ...Object.keys(chats), ...Object.keys(tickets)])).filter((id) => !left.includes(id) && EVENTS.some((e) => e.id === id));
    const act = (id: string) => { const m = chats[id]; return m && m.length ? m[m.length - 1].id : 0; };
    return ids.sort((a, b) => act(b) - act(a) || getEvent(a).sortKey - getEvent(b).sortKey);
  }, [mine, chats, tickets, left]);
  const profKey = profile ? `${profile.kind}:${profile.id}` : '';
  const isFollowing = following.includes(profKey);
  // Updates for the curated digest. Chroniclers always come first. Artists, venues and organisers reach the digest when they are in your
  // favourites (following) or on your Timelane. If both, favourites win. Saved offers feed it too.
  const tlKeys = useMemo(() => {
    const k = new Set<string>();
    homeEvents.forEach((e) => { e.artists.forEach((a) => { if (a.artistId) k.add('artist:' + a.artistId); }); k.add('venue:' + e.venueId); k.add('organiser:' + e.organiserId); });
    return k;
  }, [homeEvents]);
  type DItem = { id: string; head: string; text: string; solo: boolean; eventId?: string; stay?: boolean; chron: boolean };
  const digestItems: DItem[] = [
    ...DIGEST.map((d): DItem | null => {
      const key = `${d.about.kind}:${d.about.id}`;
      const p = getProfile(d.about.kind, d.about.id);
      const fav = following.includes(key);
      if (d.about.kind === 'user') {
        if (!fav) return null;
        const head = p.chronicler ? '📜 Chronicler' : p.friend ? 'Friend' : 'User';
        return { id: d.id, head, text: d.text, solo: true, eventId: d.eventId, stay: d.stay, chron: !!p.chronicler };
      }
      if (!fav && !tlKeys.has(key)) return null;
      const nm = p.kind === 'venue' ? (p.vname || p.name).split(' ')[0] : p.name;
      return { id: d.id, head: `${KIND_LABEL[d.about.kind]} • ${nm} ${fav ? 'from favourites' : 'from your Timelane'}`, text: d.text, solo: false, eventId: d.eventId, stay: d.stay, chron: false };
    }).filter(Boolean) as DItem[],
    ...OFFERS.filter((o) => offers.includes(o.id)).map((o): DItem => ({ id: 'so-' + o.id, head: `Offer • ${o.brand} from saved`, text: `${o.pct}% off: ${o.text}`, solo: false, eventId: undefined, stay: false, chron: false })),
  ].sort((a, b) => Number(b.chron) - Number(a.chron));
  const unread = digestItems.filter((d) => !read.includes(d.id));
  const archived = digestItems.filter((d) => read.includes(d.id));
  const fkeys = (kind: string, chron?: boolean) => following.filter((k) => { const [kd, id] = k.split(':'); const p = getProfile(kd as Kind, id); return kd === kind && !!p && (chron === undefined || !!p.chronicler === chron); });
  const savedEvents = EVENTS.filter((e) => saved.includes(e.id));
  const laterEvents = EVENTS.filter((e) => later.includes(e.id));
  const fastN = savedEvents.filter((e) => freq[e.id] === '48 hours').length;
  const toggleSaved = (id: string, past: boolean) => (past ? toggle(setLater, id) : toggle(setSaved, id));

  const mainMenu: MenuItem[] = [
    { label: 'All chats', sub: 'Every chat you are in, newest first', onPress: () => { setWalletId(null); setSection('Chats'); } },
    { label: 'Wallet settings', sub: 'Tickets, stay, travel, car', onPress: () => { setWalletId(null); setSection('Tickets'); } },
    { label: 'Explore offers', sub: 'Member offers for everyone, no ticket needed', onPress: () => setExplore({}) },
    { label: 'Digest and events setup', sub: 'How fast news reaches you', onPress: () => setSection('Settings') },
    { label: 'Manage media', sub: 'Everything you uploaded, by event', onPress: () => setSection('Media') },
    { label: 'My stats', onPress: () => setStats(true) },
    { label: 'Import tickets', sub: 'From email or a photo', soon: true },
  ];
  const settingsMenu: MenuItem[] = [
    { label: 'Profile and privacy', soon: true },
    { label: 'Notifications', soon: true },
    { label: 'Connected accounts', sub: 'Ticket, stay and travel providers', soon: true },
    { label: 'Currency and language', soon: true },
    { label: 'Help and feedback', soon: true },
    { label: 'About Hartlanes', soon: true },
    { label: 'Log out', soon: true },
  ];

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" />
      {top.t === 'lane' && profile && (
        <ProfileView key={profKey + stack.length} p={profile} events={events} isFollowing={isFollowing} onFollow={() => toggleFollow(profKey)} openEvent={openEvent} onStats={() => setPStats(true)} paused={paused} />
      )}
      {top.t === 'event' && (
        <Galaxy key={top.ev.id + stack.length} ev={top.ev} nav={nav} paused={paused}
          added={mine.includes(top.ev.id)} starred={top.ev.status === 'past' ? later.includes(top.ev.id) : saved.includes(top.ev.id)}
          onAdd={() => toggle(setMine, top.ev.id)} onStar={() => toggleSaved(top.ev.id, top.ev.status === 'past')} />
      )}
      {top.t === 'home' && (
        <ProfileHome events={homeEvents} saved={saved} following={following} paused={paused} openProfile={openProfile} openEvent={openEvent} openSection={openSection} onStats={() => setStats(true)} />
      )}
      <TopBar onSearch={() => setSearching(true)} onMenu={() => setMenu(true)} onLogo={goHome} search={searching ? { q: sq, setQ: setSq, onClose: closeSearch } : undefined} />
      {prev && <BackBtn onPress={back} />}
      {kb === 0 && (
        <View style={styles.bar}>
          {(['Tickets', 'Friends', 'Updates', 'My profile'] as const).map((n) => (
            <Pressable key={n} style={styles.barBtn} onPress={() => (n === 'My profile' ? (setSection(null), setStack([{ t: 'home' }])) : (setWalletId(null), setSection(n)))}>
              <Text style={[styles.barT, n === 'My profile' && top.t === 'home' && { color: '#ffb4a8' }]}>{n === 'Tickets' ? 'Wallet' : n}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!!section && (
        <View style={styles.modalWrap}>
          <Pressable style={{ flex: 1 }} onPress={() => setSection(null)} />
          <DragSheet bottom={kb} maxAuto={win.height * 0.75} style={{ maxHeight: win.height * 0.75 }}>
            {({ expanded, maxAuto }) => (
          <View style={expanded ? { flex: 1 } : undefined}>
            <View style={styles.mHead}>
              <Text style={[styles.mT, { flex: 1, marginRight: 10 }]}>{section === 'Tickets' ? (walletId ? `${tickets[walletId] ? 'Your ticket and trip to' : 'Your plan for'} ${tripTitle(getEvent(walletId))}` : 'Wallet') : TITLES[section] || section}</Text>
              <Pressable onPress={() => setSection(null)} hitSlop={16} style={styles.xBtn}><Text style={styles.x}>✕</Text></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={expanded ? { flex: 1 } : { maxHeight: maxAuto - 80 }}>
              {section === 'Friends' && <Tile icon="💬" title="All chats" sub={`${chatList.length} chats, newest first`} onPress={() => setSection('Chats')} />}
              {section === 'Friends' && <Head>FRIENDS</Head>}
              {section === 'Chats' && (chatList.length === 0 ? <Text style={ps.note}>You are not in any chats yet.</Text> : chatList.map((id) => {
                const e = getEvent(id);
                const ms = (chats[id] || seedChat(e.title)).filter((m) => m.who !== 'Hartlanes');
                const last = ms[ms.length - 1];
                return <Row key={id} title={e.title} sub={`${venueShort(e)} · ${e.range || e.dateLabel}${last ? `\n${last.who}: ${last.card ? last.card.title : last.t}` : ''}`} onPress={() => setOpenChat(id)} />;
              }))}
              {section === 'Friends' && profilesOf('user').filter((u) => u.friend).map((u) => (
                <Pressable key={u.id} style={ps.row} onPress={() => openProfile('user', u.id)}>
                  <View style={{ flex: 1 }}><Text style={ps.rowT}>{u.name}</Text><Text style={ps.rowS}>@{u.username} · {u.bio}</Text></View><Text style={ps.chev}>›</Text>
                </Pressable>
              ))}
              {section === 'Tickets' && walletId && tickets[walletId] && (
                <Wallet ev={getEvent(walletId)} provider={tickets[walletId]} api={ticketApi} onBack={() => setWalletId(null)} onSeeEvent={() => push({ t: 'event', ev: getEvent(walletId) })} />
              )}
              {section === 'Tickets' && !walletId && (
                <View>
                  {Object.keys(tickets).length === 0 && <Text style={ps.note}>No tickets yet. Buy one from an event's Tickets bubble and it appears here with your stay, travel and car.</Text>}
                  {EVENTS.filter((e) => tickets[e.id]).map((e) => (
                    <Pressable key={e.id} style={ps.row} onPress={() => setWalletId(e.id)}>
                      <View style={{ flex: 1 }}>
                        <Text style={ps.rowT}>{e.title} · {e.dateLabel}</Text>
                        <Text style={ps.rowS}>Ticket from {tickets[e.id]}. Open it with your stay, travel and car.</Text>
                      </View><Text style={ps.chev}>›</Text>
                    </Pressable>
                  ))}
                  <Tile icon="★" title="See all saved events" sub="Events without a ticket stay in Saved" onPress={() => setSection('Saved')} />
                </View>
              )}
              {section === 'Saved' && (
                <View>
                  <Tile icon="🏷️" title="Explore offers" sub="Filter by city, topic and discount" onPress={() => setExplore({})} />
                  <Head>SAVED EVENTS, FOR UPDATES</Head>
                  {savedEvents.length === 0 ? <Text style={ps.note}>Tap Save for updates on an upcoming event to keep it here. It sends news to your digest.</Text> : savedEvents.map((e) => (
                    <Row key={e.id} title={`${e.title} · ${e.dateLabel}`} sub={venueShort(e)} onPress={() => push({ t: 'event', ev: e })} />
                  ))}
                  <Head>SAVED OFFERS</Head>
                  {offers.length === 0 ? <Text style={ps.note}>Save offers in Explore to see them here and in your digest.</Text> : OFFERS.filter((o) => offers.includes(o.id)).map((o) => (
                    <Row key={o.id} title={`${o.pct}% · ${o.brand}`} sub={`${o.topic} · ${o.city}`} onPress={() => setExplore({ city: o.city, topic: o.topic })} />
                  ))}
                  <Head>SAVED FOR LATER</Head>
                  {laterEvents.length === 0 ? <Text style={ps.note}>Past and coming up events you save for later wait here.</Text> : laterEvents.map((e) => (
                    <Row key={e.id} title={`${e.title} · ${e.dateLabel}`} sub={`${venueShort(e)} · ${e.status === 'past' ? 'Past' : 'Coming up'}`} onPress={() => push({ t: 'event', ev: e })} />
                  ))}
                </View>
              )}
              {section === 'Following' && (
                <View>
                  <Text style={ps.note}>Following only feeds your digest and notifications. Open a Timelane to follow or unfollow.</Text>
                  {fkeys('user').length + fkeys('artist').length + fkeys('venue').length + fkeys('organiser').length === 0 && <Text style={ps.note}>You are not following anyone yet.</Text>}
                  {([['Chroniclers', 'user', true], ['Users', 'user', false], ['Artists', 'artist'], ['Venues', 'venue'], ['Organisers', 'organiser']] as [string, string, boolean?][]).map(([label, kind, chron]) => {
                    const ks = fkeys(kind, chron);
                    if (!ks.length) return null;
                    return (
                      <View key={label}>
                        <Text style={styles.sub2}>{label}</Text>
                        {ks.map((k) => { const [kd, id] = k.split(':'); const p = getProfile(kd as Kind, id); return <Row key={k} title={p.name} sub={p.kind === 'user' ? `User · @${p.username}` : KIND_LABEL[p.kind]} onPress={() => openProfile(p.kind, p.id)} />; })}
                      </View>
                    );
                  })}
                </View>
              )}
              {section === 'Media' && (
                <View>
                  <Text style={ps.rowS}>Everything you uploaded, by event, oldest event first.</Text>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    {(['all', 'photo', 'video', 'nft'] as const).map((k) => (
                      <Pressable key={k} style={[styles.fChip, mTab === k && styles.fChipOn]} onPress={() => setMTab(k)}><Text style={styles.fChipT}>{k === 'all' ? 'All' : KINDS.find((x) => x.k === k)!.label}</Text></Pressable>
                    ))}
                  </View>
                  {(() => {
                    const evs = EVENTS.filter((e) => mediaIds().includes(e.id)).sort((a, b) => a.sortKey - b.sortKey);
                    const rows = evs.map((e) => ({ e, items: mediaOf(e.id).filter((m) => mTab === 'all' || m.kind === mTab) })).filter((r) => r.items.length > 0);
                    if (rows.length === 0) return <Text style={ps.note}>Nothing here yet. Add photos, videos or NFTs from an event's Memorabilia bubble.</Text>;
                    return rows.map(({ e, items }) => (
                      <View key={e.id}>
                        <Head>{`${e.title} · ${e.range || e.dateLabel}`.toUpperCase()}</Head>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                          {items.map((m) => <MemoTile key={m.id} m={m} onRemove={() => { removeMedia(e.id, m.id); setMTick((x) => x + 1); }} />)}
                        </View>
                      </View>
                    ));
                  })()}
                </View>
              )}
              {section === 'Updates' && (
                <View>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ flex: 1, marginRight: 6 }}><Tile icon="★" title={`Saved ${saved.length + later.length + offers.length}`} onPress={() => setSection('Saved')} /></View>
                    <View style={{ flex: 1, marginLeft: 6 }}><Tile icon="👥" title={`Following ${following.length}`} onPress={() => setSection('Following')} /></View>
                  </View>
                  <Pressable style={styles.setBtn} onPress={() => setSection('Settings')}><Text style={styles.setBtnT}>Digest and events setup</Text></Pressable>
                  <View style={styles.sep} />
                  {unread.length === 0 && <Text style={ps.rowS}>You are all caught up. Follow a friend, artist, venue or organiser, or save an event or offer, to fill this.</Text>}
                  {unread.map((d) => (
                    <View key={d.id} style={ps.row}>
                      <View style={{ flex: 1 }}>
                        {d.solo ? <Text style={ps.rowT}>{d.head} • {d.text}</Text> : (<><Text style={ps.rowS}>{d.head}</Text><Text style={ps.rowT}>{d.text}</Text></>)}
                        {d.stay && (
                          <View style={{ marginTop: 6 }}>
                            <Text style={ps.rowS}>Stay ideas, so you can book early before prices jump:</Text>
                            {STAY_IDEAS.map((x, i) => <Text key={i} style={ps.fact}>• {x}</Text>)}
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', marginTop: 6 }}>
                          {d.eventId && (
                            <Pressable onPress={() => push({ t: 'event', ev: EVENTS.find((e) => e.id === d.eventId) as EventItem })}>
                              <Text style={[styles.link, { marginRight: 16 }]}>Open event</Text>
                            </Pressable>
                          )}
                          <Pressable onPress={() => setRead((r) => [...r, d.id])} hitSlop={8}><Text style={styles.link}>Mark as read</Text></Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                  <Row title="See updates archive" sub={`${archived.length} read`} onPress={() => setSection('Archive')} />
                  <Text style={ps.note}>❔ dum content for the updates. Everything lands here as it happens. Only events, and what is in your wallet, send notifications.</Text>
                </View>
              )}
              {section === 'Archive' && (archived.length === 0 ? <Text style={ps.note}>Updates you mark as read are kept here, newest first.</Text> : [...archived].reverse().map((d) => (
                <View key={d.id} style={ps.row}><View style={{ flex: 1 }}>{d.solo ? <Text style={ps.rowT}>{d.head} • {d.text}</Text> : (<><Text style={ps.rowS}>{d.head}</Text><Text style={ps.rowT}>{d.text}</Text></>)}</View></View>
              )))}
              {section === 'Settings' && (
                <View>
                  <Text style={ps.rowS}>We are not another monitoring app, and we do not want to flood you. All updates go into your Updates. Only events, and what is in your wallet, send notifications. Everything else goes into the digest.</Text>
                  <Head>THE RULES</Head>
                  <Text style={ps.fact}>• Events: the fastest notice is 48 hours, for every event, and only for 2 saved events at a time.</Text>
                  <Text style={ps.fact}>• Everything else (friends, artists, venues, organisers, offers): it can show in Updates the moment it appears, but you get no instant email or notification, and nothing faster than 7 days.</Text>
                  <Text style={ps.fact}>• A promo from an organiser is posted on the event page, and the event alerts you.</Text>
                  <Text style={ps.fact}>• Ticket sales: the organiser announces them in their updates and you are told 7 days before. On the day the event announces it again as a second nudge, with 48 hours notice. The sale opens at least 48 hours after the event told its readers.</Text>
                  <Text style={ps.fact}>• Milestones and serious badges go to your friends only, never to followers. We never announce publicly which event you are going to next without your permission.</Text>
                  <Head>SAVED EVENTS</Head>
                  <Text style={ps.note}>Fast pace (48 hours) in use: {fastN} of 2</Text>
                  {savedEvents.length === 0 && <Text style={ps.note}>No saved events yet.</Text>}
                  {savedEvents.map((e) => (
                    <View key={e.id} style={styles.fRow}>
                      <Text style={ps.rowT} numberOfLines={1}>{e.title} · {e.dateLabel}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {FREQS.map((f) => { const cur = freq[e.id] || '7 days'; const lock = f === '48 hours' && cur !== '48 hours' && fastN >= 2; return (
                          <Pressable key={f} disabled={lock} style={[styles.fChip, cur === f && styles.fChipOn, lock && { opacity: 0.35 }]} onPress={() => setFreq((x) => ({ ...x, [e.id]: f }))}><Text style={styles.fChipT}>{f}</Text></Pressable>
                        ); })}
                      </ScrollView>
                    </View>
                  ))}
                  {([['CHRONICLERS', 'user', true], ['USERS', 'user', false], ['ARTISTS', 'artist'], ['VENUES', 'venue'], ['ORGANISERS', 'organiser']] as [string, string, boolean?][]).map(([label, kind, chron]) => {
                    const ks = fkeys(kind, chron);
                    if (!ks.length) return null;
                    return (
                      <View key={label}>
                        <Head>{label}</Head>
                        {ks.map((k) => { const [kd, id] = k.split(':'); const p = getProfile(kd as Kind, id); return (
                          <View key={k} style={styles.fRow}>
                            <Text style={ps.rowT} numberOfLines={1}>{p.name}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                              {FREQS_SLOW.map((f) => (
                                <Pressable key={f} style={[styles.fChip, (freq[k] || '7 days') === f && styles.fChipOn]} onPress={() => setFreq((x) => ({ ...x, [k]: f }))}><Text style={styles.fChipT}>{f}</Text></Pressable>
                              ))}
                            </ScrollView>
                          </View>
                        ); })}
                      </View>
                    );
                  })}
                  <Head>SAVED OFFERS</Head>
                  {offers.length === 0 && <Text style={ps.note}>No saved offers yet.</Text>}
                  {OFFERS.filter((o) => offers.includes(o.id)).map((o) => (
                    <View key={o.id} style={styles.fRow}>
                      <Text style={ps.rowT} numberOfLines={1}>{o.brand}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        {FREQS_SLOW.map((f) => (
                          <Pressable key={f} style={[styles.fChip, (freq[o.id] || '7 days') === f && styles.fChipOn]} onPress={() => setFreq((x) => ({ ...x, [o.id]: f }))}><Text style={styles.fChipT}>{f}</Text></Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ))}
                  <Text style={ps.note}>❔ Proposal: the digest groups news at the pace you choose here. Default is 7 days, and never faster.</Text>
                </View>
              )}
            </ScrollView>
          </View>
            )}
          </DragSheet>
        </View>
      )}
      {!!explore && <Explore initial={explore} saved={offers} onToggle={(id) => toggle(setOffers, id)} onClose={() => setExplore(null)} />}
      {!!openChat && <FullChat ev={getEvent(openChat)} api={ticketApi} onClose={() => setOpenChat(null)} />}
      {menu && <Menu main={mainMenu} settings={settingsMenu} onClose={() => setMenu(false)} onLogo={goHome} />}
      {stats && <Stats events={homeEvents} onClose={() => setStats(false)} />}
      {pStats && profile && (profile.kind === 'user'
        ? <Stats events={events} masked={!profile.friend} title={`${profile.name} stats`} rows={[{ label: 'Followers', value: String(profile.followers || 0) }, { label: 'Following', value: String(profile.following || 0) }, ...statsFor(events, !profile.friend)]} onClose={() => setPStats(false)} />
        : <Stats events={events} title={`${profile.name} stats`} rows={profileStats(profile, events)} onClose={() => setPStats(false)} />)}
      {adding && <AddPast onClose={() => setAdding(false)} onSave={(ev) => { setCustom((c) => [...c, ev]); setAdding(false); setSection(null); setStack([{ t: 'home' }]); }} />}
      {searching && <Search q={sq} onClose={closeSearch} onProfile={openProfile} onEvent={openEvent} onAddPast={() => { closeSearch(); setAdding(true); }} />}
      {!!ask && (
        <View style={styles.askWrap}>
          <View style={styles.ask}>
            <Text style={styles.askT}>Did you buy your ticket from {ask.provider}?</Text>
            <Text style={ps.rowS}>If yes, it goes into your Wallet with your stay, travel and car.</Text>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Pressable style={[styles.askBtn, { backgroundColor: '#c93b3b' }]} onPress={() => { setTickets((t) => ({ ...t, [ask.id]: ask.provider })); setMine((m) => (m.includes(ask.id) ? m : [...m, ask.id])); const id = ask.id; setAsk(null); setSection('Tickets'); setWalletId(id); }}>
                <Text style={styles.followT}>Yes, I bought it</Text>
              </Pressable>
              <Pressable style={[styles.askBtn, { backgroundColor: '#4a4b52', marginLeft: 10 }]} onPress={() => setAsk(null)}>
                <Text style={styles.followT}>Not yet</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

export default function App() { return <Boundary><Main /></Boundary>; }

const styles = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2024', borderRadius: 12, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#ea5a52' },
  tileIc: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3a2022', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  head: { color: '#ee6e65', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 18, marginBottom: 2 },
  sub2: { color: '#ffc9bf', fontSize: 12, fontWeight: '700', marginTop: 8 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 14 },
  setBtn: { height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(238,110,101,0.7)', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  setBtnT: { color: '#ffb4a8', fontSize: 12.5, fontWeight: '600' },
  fRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  fChip: { height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  fChipOn: { backgroundColor: '#c93b3b' },
  fChipT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  follow2: { height: 36, paddingHorizontal: 22, borderRadius: 18, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', left: 18, right: 18, bottom: 76, height: 44, borderRadius: 22, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center' },
  backT: { color: '#fff', fontWeight: '700', fontSize: 15 },
  follow: { position: 'absolute', top: 100, right: 18, height: 32, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center' },
  following: { backgroundColor: '#4a4b52' },
  followT: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bar: { position: 'absolute', left: 18, right: 18, bottom: 14, height: 52, borderRadius: 26, backgroundColor: 'rgba(20,20,22,0.96)', flexDirection: 'row', overflow: 'hidden' },
  barBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barT: { color: '#fff', fontWeight: '600', fontSize: 13 },
  modalWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: '#26272b', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingTop: 6, maxHeight: '75%' },
  modalFull: { maxHeight: '100%', paddingTop: 6 },
  handleBox: { height: 22, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mT: { color: '#fff', fontSize: 18, fontWeight: '700' },
  x: { color: '#fff', fontSize: 16, fontWeight: '700' },
  xBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -6 },
  unf: { height: 26, paddingHorizontal: 12, borderRadius: 13, backgroundColor: '#4a4b52', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unfT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  link: { color: '#ffb4a8', fontSize: 13, marginTop: 6, fontWeight: '600' },
  askWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 24 },
  ask: { width: '100%', backgroundColor: '#26272b', borderRadius: 18, padding: 18 },
  askT: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  askBtn: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});

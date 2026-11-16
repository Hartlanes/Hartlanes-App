import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Keyboard, Linking } from 'react-native';
import { COLORS } from './layout';
import { EventItem, PROFILES, Profile, getProfile, badgeIcons, profileBadges, Kind, fmtN, mapsUrl, socialUrl, siteUrl } from './data';
import { Lane } from './Lane';

const SOCIALS = ['IG', 'TT', 'X', 'SP'];
const TINTS = ['#c93b3b', '#d9803a', '#caa63a', '#5aa67a', '#4f86c6', '#8a63c6'];

// The home screen is your profile: the small facts sit at the top and your Timelane runs underneath.
function ProfileHomeImpl({ events, saved, following, openProfile, openEvent, openSection, onStats, paused }: {
  paused?: boolean; events: EventItem[]; saved: string[]; following: string[];
  openProfile: (kind: Kind, id: string) => void; openEvent: (ev: EventItem) => void; openSection: (s: 'Saved' | 'Following') => void; onStats: () => void;
}) {
  const you = getProfile('user', 'you');
  const upcoming = events.filter((e) => e.status === 'upcoming');
  const friends = PROFILES.filter((p) => p.kind === 'user' && p.friend).slice(0, 5);
  const icons = useMemo(() => {
    const seen = new Set<string>();
    return badgeIcons(events).filter((b) => (seen.has(b.icon) ? false : (seen.add(b.icon), true))).slice(0, 3);
  }, [events]);
  // The "+250" friends-of-friends number grows as time passes (sample).
  const [more, setMore] = useState(250);
  useEffect(() => { const id = setInterval(() => setMore((m) => m + 1), 30000); return () => clearInterval(id); }, []);
  const [quirk, setQuirk] = useState('Collects nights out.');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const startEdit = () => { setDraft(quirk); setEditing(true); };
  // Done saves what you typed and closes the keyboard. Cancel keeps the old line. Leaving the field any other way also saves.
  const saveEdit = () => { setQuirk(draft.trim()); setEditing(false); Keyboard.dismiss(); };
  const cancelEdit = () => { setEditing(false); Keyboard.dismiss(); };
  const MAXQ = 45;
  const past = events.filter((e) => e.status === 'past').length;
  const follows = 110 + following.length - 4;
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={styles.head2}>
          <View style={styles.avatar}><Text style={styles.avatarT}>{you.name.replace(/[^A-Za-z]/g, '')[0] === 'Y' ? 'A' : you.name[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{you.name}</Text>
            </View>
            {editing ? (
              <View style={styles.quirkWrap}>
                <TextInput style={styles.quirkIn} value={draft} onChangeText={(x) => setDraft(x.slice(0, MAXQ))} maxLength={MAXQ} autoFocus onSubmitEditing={saveEdit} returnKeyType="done" placeholder="add a line about you" placeholderTextColor="rgba(255,255,255,0.4)" selectionColor="#ffc9bf" />
                <Text style={styles.quirkN}>{MAXQ - draft.length}</Text>
                <Pressable style={styles.doneBtn} onPress={saveEdit} hitSlop={8}><Text style={styles.doneT}>Done</Text></Pressable>
                <Pressable onPress={cancelEdit} hitSlop={8}><Text style={styles.cancelX}>✕</Text></Pressable>
              </View>
            ) : (
              <Pressable style={styles.quirkRow} onPress={startEdit} hitSlop={8}>
                <Text style={quirk ? styles.quirk : styles.quirkEmpty} numberOfLines={1}>{quirk || 'add a line about you'}</Text>
                <Text style={styles.pencil}> ✎</Text>
              </Pressable>
            )}
            <View style={styles.rowB}>
              <View style={styles.iconRow}>
                {icons.map((b) => (
                  <Pressable key={b.id} onPress={onStats} hitSlop={4} style={styles.ic}><Text style={styles.icT}>{b.icon}</Text></Pressable>
                ))}
                <Pressable style={styles.seeStats} onPress={onStats}><Text style={styles.seeStatsT}>Stats</Text></Pressable>
              </View>
              <View style={styles.friends}>
                {friends.map((f, i) => (
                  <Pressable key={f.id} onPress={() => openProfile('user', f.id)} hitSlop={4} style={[styles.dot, { backgroundColor: TINTS[i % TINTS.length], marginLeft: i ? -6 : 0 }]}>
                    <Text style={styles.dotT}>{f.name[0]}</Text>
                  </Pressable>
                ))}
                <Text style={styles.more}>+{more}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.row3}>
          <Pressable onPress={() => openSection('Saved')}>
            <Text style={styles.st} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              Events: <Text style={styles.stB}>{upcoming.length}</Text> future | <Text style={styles.stB}>{past}</Text> past | <Text style={styles.stB}>{12 + saved.length}</Text> saved
            </Text>
          </Pressable>
          <Pressable onPress={() => openSection('Following')}>
            <Text style={styles.st} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              Follows <Text style={styles.stB}>{follows}</Text>  ○  Followers <Text style={styles.stB}>450</Text>
            </Text>
          </Pressable>
        </View>
        <View style={styles.row4}>
          <Text style={styles.user}>@{you.username}</Text>
          <View style={styles.socials}>
            {SOCIALS.map((x) => (
              <View key={x} style={styles.soc}><Text style={styles.socT}>{x}</Text></View>
            ))}
          </View>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Lane events={events} title="" subtitle="" compact paused={paused} onOpenEvent={openEvent} />
      </View>
    </View>
  );
}

export const ProfileHome = React.memo(ProfileHomeImpl);

const KIND_LABEL: Record<Kind, string> = { user: 'User', venue: 'Venue', organiser: 'Organiser', artist: 'Artist' };
const open = (url: string) => { Linking.openURL(url).catch(() => {}); };

// The page of anyone else: one template for people, artists, venues and organisers, with the Timelane running underneath.
// People show their handle, artists, venues and organisers are public, so the website takes the place of the friends row.
export function ProfileView({ p, events, isFollowing, onFollow, openEvent, onStats, paused }: {
  p: Profile; events: EventItem[]; isFollowing: boolean; onFollow: () => void; openEvent: (ev: EventItem) => void; onStats: () => void; paused?: boolean;
}) {
  const up = events.filter((e) => e.status === 'upcoming').length;
  const past = events.length - up;
  const isUser = p.kind === 'user';
  const icons = useMemo(() => profileBadges(p, events).slice(0, 4), [p, events]);
  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: 96 }]}>
        <View style={vs.row1}>
          <View style={{ flex: 1, paddingLeft: 42 }}>
            <Text style={vs.name} numberOfLines={1}>{p.name}</Text>
            <Text style={vs.kind} numberOfLines={1}>
              {KIND_LABEL[p.kind]}
              {isUser && p.username ? <Text style={vs.handle}>  @{p.username}</Text> : null}
              {isUser ? (p.friend ? '  ·  Friend' : '  ·  Not a friend yet') : p.kind === 'artist' && p.founded ? `  ·  Founded ${p.founded}` : ''}
              {p.chronicler ? '  ·  📜 Chronicler' : ''}
            </Text>
          </View>
          <Pressable style={[vs.follow, isFollowing && vs.following]} onPress={onFollow}><Text style={vs.followT}>{isFollowing ? 'Following' : 'Follow'}</Text></Pressable>
        </View>
        <Text style={vs.bio} numberOfLines={2}>{p.bio}</Text>
        <Text style={vs.counts} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          Followers <Text style={styles.stB}>{fmtN(p.followers)}</Text>  |  Following <Text style={styles.stB}>{fmtN(p.following)}</Text>  |  Events <Text style={styles.stB}>{up}</Text> future <Text style={styles.stB}>{past}</Text> past
        </Text>
        {p.kind === 'venue' && (
          <View style={{ marginTop: 6 }}>
            <Pressable onPress={() => open(mapsUrl(p))} hitSlop={6}><Text style={vs.addr} numberOfLines={2}>📍 {p.fullAddr || p.addr}  <Text style={vs.link}>Open in Google Maps</Text></Text></Pressable>
            <Text style={vs.fact}>Capacity {p.capacity}. {p.fact}</Text>
          </View>
        )}
        <View style={vs.row5}>
          {!isUser && !!p.website ? (
            <Pressable onPress={() => open(siteUrl(p.website as string))} hitSlop={6} style={{ flexShrink: 1 }}><Text style={vs.web} numberOfLines={1}>🌐 {p.website}</Text></Pressable>
          ) : <View style={{ flex: 1 }} />}
          <View style={styles.socials}>
            {(p.socials || []).map(([net, h]) => (
              <Pressable key={net} onPress={() => open(socialUrl(net, h))} style={styles.soc}><Text style={styles.socT}>{net}</Text></Pressable>
            ))}
          </View>
        </View>
        <View style={vs.row6}>
          {icons.map((b) => (
            <Pressable key={b.id} onPress={onStats} hitSlop={4} style={styles.ic}><Text style={styles.icT}>{b.icon}</Text></Pressable>
          ))}
          <Pressable style={styles.seeStats} onPress={onStats}><Text style={styles.seeStatsT}>Stats</Text></Pressable>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Lane events={events} title="" subtitle="" compact paused={paused} onOpenEvent={openEvent} />
      </View>
    </View>
  );
}

const vs = StyleSheet.create({
  row1: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontSize: 18, fontWeight: '700' },
  kind: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 },
  handle: { color: '#ffc9bf', fontWeight: '700' },
  follow: { height: 32, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  following: { backgroundColor: '#4a4b52' },
  followT: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bio: { color: '#f4efe4', fontSize: 12.5, marginTop: 8 },
  counts: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 8 },
  addr: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  link: { color: '#ffb4a8', textDecorationLine: 'underline', fontWeight: '700' },
  fact: { color: 'rgba(255,255,255,0.6)', fontSize: 11.5, marginTop: 3 },
  row5: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  web: { color: '#ffc9bf', fontSize: 13, fontWeight: '700' },
  row6: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  top: { paddingTop: 96, paddingHorizontal: 18, paddingBottom: 8, backgroundColor: COLORS.bg },
  head2: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#c93b3b', borderWidth: 2, borderColor: '#ffc9bf', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarT: { color: '#fff', fontSize: 20, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontSize: 17, fontWeight: '700', marginRight: 8 },
  quirk: { color: '#f4efe4', fontSize: 12.5, flexShrink: 1 },
  quirkEmpty: { color: 'rgba(255,255,255,0.45)', fontSize: 12.5, fontStyle: 'italic', flexShrink: 1 },
  quirkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  pencil: { color: 'rgba(255,255,255,0.32)', fontSize: 11 },
  quirkWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,201,191,0.6)' },
  quirkIn: { flex: 1, color: '#fff', fontSize: 12.5, paddingVertical: 0, paddingHorizontal: 0, height: 22, includeFontPadding: false },
  quirkN: { color: '#ffc9bf', fontSize: 10, marginLeft: 6 },
  doneBtn: { height: 22, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginBottom: 2 },
  doneT: { color: '#fff', fontSize: 11, fontWeight: '800' },
  cancelX: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800', marginLeft: 8 },
  rowB: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  ic: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#3a2022', alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  icT: { fontSize: 13 },
  seeStats: { height: 26, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,201,191,0.6)', alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  seeStatsT: { color: '#ffc9bf', fontSize: 11, fontWeight: '700' },
  friends: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  dotT: { color: '#fff', fontSize: 11, fontWeight: '800' },
  more: { color: '#ffc9bf', fontSize: 13, fontWeight: '800', marginLeft: 8 },
  row3: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  row4: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  user: { color: '#ffc9bf', fontSize: 13, fontWeight: '700' },
  socials: { flexDirection: 'row' },
  soc: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  socT: { color: '#fff', fontSize: 8, fontWeight: '800' },
  st: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  stB: { color: '#fff', fontWeight: '800' },
});

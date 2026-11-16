import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS, mainRadius, paletteOf } from './layout';
import type { EventItem } from './data';
import { getProfile, mainTarget, venueShort, goingOf } from './data';

// The tap-a-bubble hint is shown until it has been dismissed once.
let hintSeen = false;
// The 'also on' dates are shown once, the first time any event with more dates is opened.
let alsoSeen = false;
import { Cosmos } from './Cosmos';
import { useKeyboard } from './useKeyboard';
import { ElementPanel, Nav, Row, s as ps } from './Panels';
import { DragSheet } from './Sheet';

export function Galaxy({ ev, nav, added, starred, onAdd, onStar, paused }: { ev: EventItem; nav: Nav; added: boolean; starred: boolean; onAdd: () => void; onStar: () => void; paused?: boolean }) {
  const { height, width } = useWindowDimensions();
  const kb = useKeyboard();
  const colors = paletteOf(ev);
  const R = 50 + ((mainRadius(ev.attendance) - 30) / 12) * 8;
  const [sel, setSel] = useState<string | null>(null);
  const [hint, setHint] = useState(!hintSeen);
  const [also, setAlso] = useState(!!ev.also && !alsoSeen);
  useEffect(() => () => { if (ev.also) alsoSeen = true; }, [ev.also]);
  const venue = getProfile('venue', ev.venueId);
  const tgt = mainTarget(ev);
  const bought = nav.ticket.get(ev.id);
  const upcoming = ev.status === 'upcoming';
  const mainLabel = !added ? (upcoming ? "I'm going" : 'I was there') : upcoming ? (bought ? 'Your ticket' : 'Get your ticket') : 'My memories';
  const onMain = () => {
    if (!added) { onAdd(); return; }
    if (!upcoming) { setSel('Memorabilia'); return; }
    if (bought) nav.ticket.openWallet(ev.id);
    else setSel('Tickets');
  };
  const shown = (hint ? 1 : 0) + (also ? 1 : 0);
  // The cluster has ONE fixed centre, so it never shifts when a hint is dismissed. It sits low enough that the three header rows plus both hints
  // (when they are showing) end above the highest bubble, and high enough to stay clear of the main button.
  const extent = width / 2 - 6;
  const cy = Math.min(152 + 66 + 92 + extent + 6, height - 150 - extent);
  return (
    <View style={styles.root}>
      <Cosmos id={ev.id} title={ev.title} labels={ev.elements} colors={colors} R={R} height={height} cy={cy} paused={paused} onPick={(l) => setSel(l === '__none' ? null : l)} />
      <View style={styles.acts}>
        <Pressable style={[styles.act, starred && styles.actOn]} onPress={onStar}><Text style={styles.actT}>{ev.status === 'past' ? (starred ? '★ Saved for later' : '☆ Save for later') : starred ? '★ Saved' : '☆ Save for updates'}</Text></Pressable>
        <Text style={styles.savedN}>{340 + (starred ? 1 : 0)} saved it</Text>
      </View>
      <View pointerEvents="none" style={styles.head}>
        <Text style={styles.kicker}>EVENT UNIVERSE</Text>
        <Text style={styles.t}>{ev.title}</Text>
      </View>
      <View style={styles.rows} pointerEvents="box-none">
        <Text style={styles.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{ev.range || ev.dateLabel}{ev.time ? ` · ${ev.time}` : ''} • {venueShort(ev)}</Text>
        <Text style={styles.sub}>{ev.attendance.toLocaleString('en-GB')} {upcoming ? 'attending' : 'attended'} | {goingOf(ev.id)} {upcoming ? 'via' : 'on'} Hartlanes dum</Text>
        {added && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.addedRow}>● Added to your Timelane</Text>
            {!bought && <Pressable onPress={onAdd} hitSlop={10} style={{ marginLeft: 12 }}><Text style={styles.removeT}>Remove</Text></Pressable>}
          </View>
        )}
        {shown > 0 && (
          <View>
            {also && (
              <View style={styles.hint}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.sub, { flex: 1, marginTop: 0 }]}>❔ Also on {ev.also}. See the artist Timelane for all dates.</Text>
                <Pressable style={styles.hintX} onPress={() => { alsoSeen = true; setAlso(false); }} hitSlop={10}><Text style={styles.x}>✕</Text></Pressable>
              </View>
            )}
            {hint && (
              <View style={styles.hint}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.sub, { flex: 1, marginTop: 0 }]}>❔ Tap a bubble to open it, or drag to turn the cluster</Text>
                <Pressable style={styles.hintX} onPress={() => { hintSeen = true; setHint(false); }} hitSlop={10}><Text style={styles.x}>✕</Text></Pressable>
              </View>
            )}
          </View>
        )}
      </View>
      {kb === 0 && (
        <Pressable style={styles.main} onPress={onMain}><Text style={styles.mainT}>{mainLabel}</Text></Pressable>
      )}
      {sel && (
        <DragSheet bottom={kb > 0 ? kb + 8 : 72} maxAuto={height * (sel === 'Tickets' ? 0.55 : 0.4)}>
          {({ expanded, maxAuto }) => (
            <View style={expanded ? { flex: 1 } : undefined}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetT}>{sel === '__main' ? ev.title : sel}</Text>
                <Pressable onPress={() => setSel(null)} hitSlop={16} style={styles.xBtn}><Text style={styles.x}>✕</Text></Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={expanded ? { flex: 1 } : { maxHeight: kb > 0 ? Math.max(120, height - kb - 200) : maxAuto }}>
                {sel === '__main' ? (
                  <View>
                    <Text style={ps.rowT}>{ev.dateLabel}{ev.time ? ` · ${ev.time}` : ''} · {venueShort(ev)}</Text>
                    <Text style={ps.rowS}>{venue.name} · {upcoming ? 'Upcoming' : 'Past'}</Text>
                    {!!ev.note && <Text style={ps.note}>{ev.note}</Text>}
                    <Row title={`Open ${tgt.name}'s Timelane`} sub={tgt.kind === 'artist' ? 'Every date, back to the beginning' : 'Every event they run'} onPress={() => nav.openProfile(tgt.kind, tgt.id)} />
                  </View>
                ) : (
                  <ElementPanel name={sel} ev={ev} nav={nav} />
                )}
              </ScrollView>
            </View>
          )}
        </DragSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  head: { position: 'absolute', top: 100, left: 58, right: 150 },
  rows: { position: 'absolute', top: 152, left: 18, right: 14 },
  addedRow: { color: '#ff5a4f', fontSize: 13, fontWeight: '700', marginTop: 2 },
  removeT: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2, textDecorationLine: 'underline' },
  hint: { flexDirection: 'row', alignItems: 'center', marginTop: 6, height: 34, backgroundColor: 'rgba(20,20,22,0.75)', borderRadius: 10, paddingLeft: 8, paddingRight: 4 },
  hintX: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  kicker: { color: '#ee6e65', fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginBottom: 4 },
  main: { position: 'absolute', left: 18, right: 18, bottom: 76, height: 44, borderRadius: 22, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center' },
  mainT: { color: '#fff', fontWeight: '700', fontSize: 15 },
  t: { color: '#fff', fontSize: 22, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  acts: { position: 'absolute', top: 98, right: 14, alignItems: 'flex-end' },
  act: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(20,20,22,0.8)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  savedN: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginRight: 4, marginBottom: 8 },
  actOn: { backgroundColor: '#c93b3b' },
  actT: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sheet: { position: 'absolute', left: 0, right: 0, backgroundColor: '#26272b', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sheetT: { color: '#fff', fontSize: 17, fontWeight: '700' },
  x: { color: '#fff', fontSize: 16, fontWeight: '700' },
  xBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -6 },
});

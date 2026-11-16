import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, TextInput } from 'react-native';
import type { EventItem } from './data';
import { SHEET_TOP } from './Sheet';

// Memorabilia: everything the user keeps from an event. All of it is uploaded by the user: photos, videos and NFTs.
// For now the uploads are sample tiles kept while the app is open. Real picking from the phone gallery comes with the upload build.
export type MemoItem = { id: number; kind: 'photo' | 'video' | 'nft'; title: string; note: string };
const STORE: Record<string, MemoItem[]> = {};
let nid = 1;
// The auto name is a marker: event + short date + country code + Memo, e.g. "Glastonbury Jun 19' UK Memo".
export const memoName = (ev: EventItem, n: number) => `${ev.title} ${ev.dateLabel.replace(/(\d{4})$/, (y) => y.slice(2) + "'")}${ev.cc ? ' ' + ev.cc : ''} Memo${n > 1 ? ' ' + n : ''}`;
export const mediaOf = (id: string): MemoItem[] => STORE[id] || [];
export const mediaIds = () => Object.keys(STORE).filter((k) => STORE[k].length > 0);
export const removeMedia = (evId: string, mid: number) => { const l = STORE[evId]; if (!l) return; const i = l.findIndex((x) => x.id === mid); if (i >= 0) l.splice(i, 1); };
// A few dum uploads for the past event, so the Manage media page has something to show.
STORE['glastonbury-2019'] = [
  { id: nid++, kind: 'video', title: 'Glastonbury Jun 19\' UK Memo 3', note: 'dum' },
  { id: nid++, kind: 'photo', title: 'Glastonbury Jun 19\' UK Memo 2', note: 'dum' },
  { id: nid++, kind: 'photo', title: 'Glastonbury Jun 19\' UK Memo', note: 'dum' },
];
const TINT: Record<string, string> = { photo: '#7a2a2a', video: '#2a3f7a', nft: '#5a2f7a' };
export const ICON: Record<string, string> = { photo: '🖼️', video: '🎞️', nft: '🪙' };
export const KINDS: { k: 'photo' | 'video' | 'nft'; label: string; add: string }[] = [
  { k: 'photo', label: 'Photos', add: 'Add photo' },
  { k: 'video', label: 'Videos', add: 'Add video' },
  { k: 'nft', label: 'NFTs', add: 'Add NFT' },
];

function useMemo2(ev: EventItem) {
  const id = ev.id;
  const [, tick] = useState(0);
  const items = STORE[id] || (STORE[id] = []);
  return {
    items,
    add: (kind: MemoItem['kind'], title: string, note: string) => { items.unshift({ id: nid++, kind, title: title || memoName(ev, items.length + 1), note }); tick((x) => x + 1); },
    remove: (mid: number) => { const i = items.findIndex((x) => x.id === mid); if (i >= 0) items.splice(i, 1); tick((x) => x + 1); },
  };
}

export function Tile({ m, onRemove }: { m: MemoItem; onRemove?: () => void }) {
  return (
    <View style={[s.tile, { backgroundColor: TINT[m.kind] }]}>
      <Text style={s.ico}>{ICON[m.kind]}</Text>
      <Text style={s.tT} numberOfLines={2}>{m.title}</Text>
      {!!m.note && <Text style={s.tN} numberOfLines={2}>{m.note}</Text>}
      {onRemove && <Pressable style={s.rm} onPress={onRemove} hitSlop={8}><Text style={s.rmT}>✕</Text></Pressable>}
    </View>
  );
}

// The extended page: tabs for photos, videos and NFTs, an add form, and the whole grid.
export function MemoFull({ ev, onClose }: { ev: EventItem; onClose: () => void }) {
  const { items, add, remove } = useMemo2(ev);
  const [tab, setTab] = useState<'all' | 'photo' | 'video' | 'nft'>('all');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const list = items.filter((m) => tab === 'all' || m.kind === tab);
  return (
    <Modal visible transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        <View style={s.head}>
          <Text style={[s.h, { flex: 1 }]} numberOfLines={1}>{ev.title} memorabilia</Text>
          <Pressable onPress={onClose} hitSlop={16} style={s.x}><Text style={s.xT}>✕</Text></Pressable>
        </View>
        <Text style={s.sub}>Your own photos, videos and NFTs from this event. Only you add to it.</Text>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {(['all', 'photo', 'video', 'nft'] as const).map((k) => (
            <Pressable key={k} style={[s.chip, tab === k && s.chipOn]} onPress={() => setTab(k)}>
              <Text style={s.chipT}>{k === 'all' ? `All ${items.length}` : `${KINDS.find((x) => x.k === k)!.label} ${items.filter((m) => m.kind === k).length}`}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={title} onChangeText={setTitle} placeholder="Title (optional, it is named for you)" placeholderTextColor="#777" style={s.input} />
        <TextInput value={note} onChangeText={setNote} placeholder="A note about it (optional)" placeholderTextColor="#777" style={[s.input, { marginTop: 6 }]} />
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {KINDS.map((k) => (
            <Pressable key={k.k} style={s.addBtn} onPress={() => { add(k.k, title.trim(), note.trim()); setTitle(''); setNote(''); }}><Text style={s.chipT}>{k.add}</Text></Pressable>
          ))}
        </View>
        <ScrollView style={{ flex: 1, marginTop: 10 }}>
          {list.length === 0 && <Text style={s.sub}>Nothing here yet. Add your first memory above.</Text>}
          <View style={s.grid}>{list.map((m) => <Tile key={m.id} m={m} onRemove={() => remove(m.id)} />)}</View>
          <Text style={s.note}>❔ dum tiles for now. Picking real photos and videos from your phone comes next, and NFTs will be linked from your wallet.</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// The bubble version: a short strip of your latest items and a button to open the full page.
export function MemoBubble({ ev }: { ev: EventItem }) {
  const { items } = useMemo2(ev);
  const [open, setOpen] = useState(false);
  const n = (k: string) => items.filter((m) => m.kind === k).length;
  return (
    <View>
      <Text style={s.rowT}>{items.length ? `${n('photo')} photos · ${n('video')} videos · ${n('nft')} NFTs` : 'Your photos, videos and NFTs from this event'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
        {items.slice(0, 6).map((m) => <Tile key={m.id} m={m} />)}
      </ScrollView>
      <Pressable style={s.openBtn} onPress={() => setOpen(true)}><Text style={s.openT}>{items.length ? 'Open all memorabilia ›' : 'Add your first memory ›'}</Text></Pressable>
      {open && <MemoFull ev={ev} onClose={() => setOpen(false)} />}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, marginTop: SHEET_TOP, backgroundColor: '#26272b', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center' },
  h: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  rowT: { color: '#fff', fontSize: 15, fontWeight: '600' },
  x: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  xT: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chip: { height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  chipOn: { backgroundColor: '#c93b3b' },
  chipT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: '#15161a', color: '#fff', borderRadius: 8, paddingHorizontal: 10, height: 40, marginTop: 10 },
  addBtn: { height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: 104, height: 104, borderRadius: 12, padding: 8, marginRight: 8, marginBottom: 8, justifyContent: 'flex-end' },
  ico: { position: 'absolute', top: 8, left: 8, fontSize: 22 },
  tT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tN: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  rm: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  rmT: { color: '#fff', fontSize: 11, fontWeight: '700' },
  openBtn: { height: 34, borderRadius: 17, backgroundColor: '#c93b3b', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  openT: { color: '#fff', fontWeight: '700', fontSize: 13 },
  note: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 },
});

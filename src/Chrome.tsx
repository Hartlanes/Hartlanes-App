import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';

export const CORAL = '#ee6e65';

// The Hartlanes wordmark, as on the website: HART in cream, LANES in coral, wide letter spacing.
export function Logo({ size = 16, tight }: { size?: number; tight?: boolean }) {
  return (
    <Text style={{ fontSize: size, fontWeight: '900', letterSpacing: size * (tight ? 0.12 : 0.24) }}>
      <Text style={{ color: '#f1ece0' }}>HART</Text>
      <Text style={{ color: CORAL }}>LANES</Text>
    </Text>
  );
}

// A 2 px red line marks where the app starts under the phone status bar. Right after the logo it ripples gently up and down, like a ribbon, then runs on.
const LINE_Y = 38;
function RedLine({ width, x0 }: { width: number; x0: number }) {
  const d = React.useMemo(() => {
    const L = 120; const A = 6.5; const C = 2.5;
    let p = `M 0 ${LINE_Y} L ${x0} ${LINE_Y}`;
    for (let u = 0; u <= 1.0001; u += 0.01) {
      const env = Math.sin(Math.PI * u);
      p += ` L ${(x0 + L * u).toFixed(1)} ${(LINE_Y - A * env * Math.sin(2 * Math.PI * C * u)).toFixed(1)}`;
    }
    p += ` L ${width} ${LINE_Y}`;
    return p;
  }, [width, x0]);
  return (
    <Canvas style={{ position: 'absolute', top: 0, left: 0, width, height: 44 }} pointerEvents="none">
      <Path path={d} style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" color="#e5473f" />
    </Canvas>
  );
}

// The same bar sits at the top of every page: logo, search field and a clean burger, all in one row.
// While searching, the field itself becomes the input, so the logo and the burger stay visible.
export function TopBar({ onSearch, onMenu, onLogo, search }: { onSearch: () => void; onMenu: () => void; onLogo?: () => void; search?: { q: string; setQ: (x: string) => void; onClose: () => void } }) {
  const { width } = useWindowDimensions();
  const logoSize = 19;
  // The ripple sits where it was in b20 (starting 118 px in, clear of the camera cut-out), whatever the logo size.
  const x0 = 118;
  return (
    <>
      <RedLine width={width} x0={x0} />
      <View style={s.wrap} pointerEvents="box-none">
        <Pressable onPress={search ? search.onClose : onLogo} hitSlop={8}><Logo size={logoSize} tight /></Pressable>
        {search ? (
          <View style={s.field}>
            <Text style={s.iconT}>🔍</Text>
            <TextInput autoFocus value={search.q} onChangeText={search.setQ} placeholder="find a new or past event" placeholderTextColor="rgba(255,255,255,0.5)" style={s.input} returnKeyType="search" autoCapitalize="none" autoCorrect={false} />
            <Pressable onPress={search.onClose} hitSlop={10}><Text style={s.cancelT}>✕</Text></Pressable>
          </View>
        ) : (
          <Pressable style={s.field} onPress={onSearch} hitSlop={6}>
            <Text style={s.iconT}>🔍</Text>
            <Text style={s.ph} numberOfLines={1}>find a new or past event</Text>
          </Pressable>
        )}
        <Pressable style={s.burger} onPress={onMenu} hitSlop={10}>
          <View style={s.bar3} /><View style={s.bar3} /><View style={s.bar3} />
        </Pressable>
      </View>
    </>
  );
}

// The back arrow sits on the row under the logo, beside the page title, so the logo is never crowded.
export function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={s.back2} onPress={onPress} hitSlop={10}><Text style={s.backT}>‹</Text></Pressable>
  );
}

const s = StyleSheet.create({
  back2: { position: 'absolute', top: 100, left: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  wrap: { position: 'absolute', top: 48, left: 14, right: 14, height: 38, flexDirection: 'row', alignItems: 'center', zIndex: 25 },
  back: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  backT: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -3 },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#3b3c42', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  iconT: { fontSize: 11, marginRight: 6 },
  field: { flex: 1, height: 28, borderRadius: 14, backgroundColor: '#34353b', marginLeft: 12, marginRight: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ph: { flexShrink: 1, color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  input: { flex: 1, color: '#fff', fontSize: 12, paddingVertical: 0, height: 28 },
  cancelT: { color: '#ffb4a8', fontSize: 13, fontWeight: '800' },
  burger: { width: 30, height: 28, alignItems: 'flex-end', justifyContent: 'center' },
  bar3: { width: 24, height: 3, borderRadius: 2, backgroundColor: '#ffffff', marginVertical: 2.2 },
  menuIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  menu: { height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  menuT: { color: '#f1ece0', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});

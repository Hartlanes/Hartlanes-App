import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Canvas, Path, Group, Text as SkText, matchFont, Skia } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useAnimatedReaction, useSharedValue, useDerivedValue, withDecay, withRepeat, withTiming, Easing, cancelAnimation, runOnJS, useFrameCallback } from "react-native-reanimated";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { COLORS, EVENT_FONT, geom, yPositions, posAt, thetaAt, axisAt, placeAround } from './layout';
import type { EventItem } from './data';
import { Cluster } from './Cluster';

const FAMILY = Platform.select({ ios: 'Helvetica', default: 'sans-serif' }) as string;

// The stem is one thick winding tube drawn in three layers (dark, mid, light), like the first design.
function useStem(off: number, scrollY: any, phase: any, light: any, width: number, height: number, top: number, bottom: number) {
  return useDerivedValue(() => {
    const pb = Skia.PathBuilder.Make();
    const lo = Math.max(top, scrollY.value - 16);
    const hi = Math.min(bottom, scrollY.value + height + 16);
    let first = true;
    for (let wy = Math.floor(lo / 8) * 8; wy <= hi; wy += 8) {
      const th = thetaAt(wy) + phase.value;
      const x = width / 2 + axisAt(wy) * Math.sin(th);
      if (first) { pb.moveTo(x, wy - scrollY.value); first = false; } else pb.lineTo(x, wy - scrollY.value);
    }
    return pb.detach();
  });
}

// The stem is drawn as stacked strokes, dark at the edge to soft light in the middle, so it shines like the bubbles.
const STEM_LAYERS: [number, string, number][] = [
  [22.4, '#4e0b0b', 0], [20.0, '#5f1010', 0.4], [17.6, '#741616', 0.9], [15.2, '#8a1d1d', 1.5], [12.8, '#9f2626', 2.2],
  [10.4, '#b43232', 3], [8.0, '#c94643', 3.8], [5.6, '#dd6a62', 4.6], [3.6, '#ee9488', 5.4], [1.76, '#ffc9bf', 6],
];
function StemLayers({ path, light }: { path: any; light: any }) {
  return (
    <>
      {STEM_LAYERS.map(([w, col, k], i) => (
        <StemLayer key={i} path={path} light={light} w={w} col={col} k={k} />
      ))}
    </>
  );
}
function StemLayer({ path, light, w, col, k }: { path: any; light: any; w: number; col: string; k: number }) {
  const t = useDerivedValue(() => [{ translateX: light.value * k }]);
  return (
    <Group transform={t}>
      <Path path={path} style="stroke" strokeWidth={w} strokeCap="round" strokeJoin="round" color={col} />
    </Group>
  );
}

function Marker({ wy, text, scrollY, font, color, top }: { wy: number; text: string; scrollY: any; font: any; color: string; top: number }) {
  const t = useDerivedValue(() => [{ translateY: wy - scrollY.value }]);
  const o = useDerivedValue(() => (wy - scrollY.value < top - 4 ? 0 : 1));
  return (
    <Group transform={t} opacity={o}>
      <SkText x={14} y={0} text={text} font={font} color={color} />
    </Group>
  );
}

// Left-hand date rail: one tick per day that has an event. Month on top, year underneath, and the tick sits between the two rows.
// Several events on one day show a count after the month, e.g. "Jun (4)". The full date is always on the event universe.
function DateTick({ wy, month, year, scrollY, font, top }: { wy: number; month: string; year: string; scrollY: any; font: any; top: number }) {
  const t = useDerivedValue(() => [{ translateY: wy - scrollY.value }]);
  const o = useDerivedValue(() => { const y = wy - scrollY.value; return y < top ? Math.max(0, (y - (top - 40)) / 40) : 1; });
  const col = 'rgba(255,255,255,0.78)';
  return (
    <Group transform={t} opacity={o}>
      <Path path={'M 0 0 L 7 0'} style="stroke" strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
      {!!month && <SkText x={10} y={-3.5} text={month} font={font} color={col} />}
      <SkText x={10} y={month ? 10.5 : 3.5} text={year} font={font} color={col} />
    </Group>
  );
}

// NOW and Day one never leave the visible area: scroll far away and they wait at the edge of the screen, so you can always find your way back.
function StickyTick({ wy, text, scrollY, font, lo, hi, now, width, color }: { wy: number; text: string; scrollY: any; font: any; lo: number; hi: number; now?: boolean; width: number; color?: string }) {
  // NOW sticks to the top only. Day one sticks to the base only.
  const t = useDerivedValue(() => { const y = wy - scrollY.value; return [{ translateY: now ? Math.max(lo, y) : Math.min(hi, y) }]; });
  const o = useDerivedValue(() => (!now && wy - scrollY.value < lo - 4 ? 0 : 1));
  const col = color || '#ff8f80';
  return (
    <Group transform={t} opacity={o}>
      {now && <Path path={`M 0 0 L ${Math.round(width)} 0`} style="stroke" strokeWidth={1} color="rgba(255,143,128,0.28)" />}
      <Path path={'M 0 0 L 12 0'} style="stroke" strokeWidth={2.5} color={col} />
      <SkText x={16} y={3.5} text={text} font={font} color={col} />
    </Group>
  );
}

const NOW_KEY = (() => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); })();

function LaneImpl({ events, title, subtitle, onOpenEvent, compact, paused }: { events: EventItem[]; title: string; subtitle: string; onOpenEvent: (ev: EventItem) => void; compact?: boolean; paused?: boolean }) {
  const win = useWindowDimensions();
  const [sz, setSz] = useState({ w: win.width, h: win.height });
  const width = sz.w;
  const height = sz.h;
  const off = compact ? 100 : -50;
  const top = compact ? 34 : 172;
  const scrollY = useSharedValue(0);
  const phase = useSharedValue(0);
  const lastTouch = useSharedValue(0);
  // One slow loop: bubbles drift round their event and come back to the start every 3 minutes.
  const clock = useSharedValue(0);
  // Everything stands still while a popup is open or the app is in the background, so the phone has nothing to draw and stays responsive.
  const fc = useFrameCallback((fi) => {
    const dt = fi.timeSincePreviousFrame ?? 16;
    if (Date.now() - lastTouch.value > 2500) phase.value -= dt * 0.00006;
  });
  React.useEffect(() => {
    fc.setActive(!paused);
    if (paused) { cancelAnimation(clock); return; }
    const c0 = clock.value;
    clock.value = withRepeat(withTiming(c0 + 1, { duration: 180000, easing: Easing.linear }), -1, false);
  }, [paused]);
  const light = useDerivedValue(() => Math.sin(phase.value * 0.7 + scrollY.value * 0.002));

  const ys = useMemo(() => yPositions(events).map((y) => y - off), [events, off]);
  const geoms = useMemo(() => placeAround(events.map((e, i) => geom(e, i)), ys), [events, ys]);
  const worldBottom = (ys.length ? ys[ys.length - 1] : 200) + 200;
  const maxScroll = Math.max(0, worldBottom - height + 210);
  const font = useMemo(() => matchFont({ fontFamily: FAMILY, fontSize: EVENT_FONT, fontWeight: 'bold' }), []);
  const markFont = useMemo(() => matchFont({ fontFamily: FAMILY, fontSize: 13, fontWeight: 'bold' }), []);

  const stemTop = 125 - off;
  const stemBottom = worldBottom - 60;
  const stemPath = useStem(0, scrollY, phase, light, width, height, stemTop, stemBottom);
  // Standing still, the Timelane turns very slowly. Touching it stops that, and it starts again a few seconds after you let go.

  const hit = useMemo(() => geoms.map((g, i) => ({ wy: ys[i], D: g.D, beta: g.beta, ext: g.ext, r: g.r })), [geoms, ys]);
  const openRef = useRef(onOpenEvent);
  openRef.current = onOpenEvent;
  const open = useCallback((i: number) => { const e = events[i]; if (e) openRef.current(e); }, [events]);

  // Where NOW waits at the top: right under the start of the Timelane field.
  const nowTop = compact ? 8 : top - 2;
  const trackTop = top + 8;
  const trackH = Math.max(60, height - trackTop - 90);
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onBegin(() => { cancelAnimation(scrollY); cancelAnimation(phase); lastTouch.value = Date.now(); })
      .onChange((e) => {
        scrollY.value = Math.min(maxScroll, Math.max(0, scrollY.value - e.changeY));
        phase.value += e.changeX * 0.011;
        lastTouch.value = Date.now();
      })
      .onEnd((e) => {
        scrollY.value = withDecay({ velocity: -e.velocityY, clamp: [0, maxScroll] });
        phase.value = withDecay({ velocity: e.velocityX * 0.011, deceleration: 0.996 });
        lastTouch.value = Date.now() + 1500;
      });
    const tap = Gesture.Tap().onEnd((e, ok) => {
      if (!ok) return;
      let best = -1; let bz = -9;
      for (let i = 0; i < hit.length; i++) {
        const h = hit[i];
        const p = posAt(h.wy, scrollY.value, phase.value, h, width);
        const dx = e.x - p.x; const dy = e.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < h.ext * p.s * 0.85 && p.zz > bz) { bz = p.zz; best = i; }
      }
      if (best >= 0) runOnJS(open)(best);
    });
    return Gesture.Race(tap, pan);
  }, [hit, maxScroll, width, open]);
  // Drag along the left edge to jump through time quickly, like scrolling a phone agenda.
  // Hold your finger on the left edge and the years that have events appear. Slide to a year to jump straight to it.
  const yearsOn = useSharedValue(false);
  const activeIdx = useSharedValue(-1);
  const [actUI, setActUI] = useState(-1);
  const tick = useCallback((first: boolean) => { try { if (first) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); else Haptics.selectionAsync(); } catch (e) { /* no haptics here */ } }, []);
  useAnimatedReaction(() => activeIdx.value, (v, prev) => { if (v !== prev) { runOnJS(setActUI)(v); if (v >= 0) runOnJS(tick)(false); } });
  const [yearsUI, setYearsUI] = useState(false);
  const yearList = useMemo(() => {
    const out: { year: number; sy: number }[] = [];
    events.forEach((e, i) => { const y = Math.floor(e.sortKey / 10000); if (!out.length || out[out.length - 1].year !== y) out.push({ year: y, sy: Math.max(0, Math.min(maxScroll, ys[i] - (top + 90))) }); });
    return out;
  }, [events, ys, maxScroll, top]);
  const yearSY = useMemo(() => yearList.map((y) => y.sy), [yearList]);
  const moveTo = (y: number) => {
    'worklet';
    if (yearsOn.value && yearSY.length > 0) {
      const f = Math.min(1, Math.max(0, (y - trackTop) / trackH));
      const idx = Math.round(f * (yearSY.length - 1));
      activeIdx.value = idx;
      scrollY.value = yearSY[idx];
    } else {
      scrollY.value = Math.min(maxScroll, Math.max(0, ((y - trackTop) / trackH) * maxScroll));
    }
  };
  const scrub = useMemo(() => {
    const pan = Gesture.Pan()
      .onBegin((e) => { cancelAnimation(scrollY); lastTouch.value = Date.now(); moveTo(e.y); })
      .onChange((e) => { moveTo(e.y); lastTouch.value = Date.now(); })
      .onEnd(() => { lastTouch.value = Date.now(); });
    const lp = Gesture.LongPress().minDuration(300).maxDistance(2000)
      .onStart(() => { yearsOn.value = true; runOnJS(setYearsUI)(true); runOnJS(tick)(true); })
      .onFinalize(() => { yearsOn.value = false; activeIdx.value = -1; runOnJS(setYearsUI)(false); });
    return Gesture.Simultaneous(pan, lp);
  }, [maxScroll, trackTop, trackH, yearSY]);
  const thumb = useAnimatedStyle(() => ({ top: 8 + (maxScroll > 0 ? (scrollY.value / maxScroll) * (trackH - 36) : 0) }));

  // Date rail: only days that have events, with a count when several events share a day, plus a NOW point that is always there.
  const rail = useMemo(() => {
    const out: { wy: number; month: string; year: string }[] = [];
    let i = 0;
    while (i < events.length) {
      let j = i;
      while (j + 1 < events.length && events[j + 1].sortKey === events[i].sortKey) j++;
      const tk = events[i].dateLabel.split(' ');
      const year = tk[tk.length - 1];
      const mo = tk.length >= 2 ? tk[tk.length - 2] : '';
      out.push({ wy: (ys[i] + ys[j]) / 2, month: mo ? mo + (j > i ? ` (${j - i + 1})` : '') : '', year });
      i = j + 1;
    }
    return out;
  }, [events, ys]);
  const nowWy = useMemo(() => {
    if (!ys.length) return stemTop + 60;
    const idx = events.findIndex((e) => e.sortKey <= NOW_KEY);
    if (idx === 0) return ys[0] - 55;
    if (idx < 0) return ys[ys.length - 1] + 70;
    return (ys[idx - 1] + ys[idx]) / 2;
  }, [events, ys, stemTop]);

  const layers = (layer: 'back' | 'front' | 'label') => {
    const out: React.ReactNode[] = [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      out.push(<Cluster key={layer + ev.id} ev={ev} wy={ys[i]} g={geoms[i]} width={width} scrollY={scrollY} phase={phase} clock={clock} light={light} layer={layer} font={font} top={top} />);
    }
    return out;
  };
  const railFont = useMemo(() => matchFont({ fontFamily: FAMILY, fontSize: 9.5, fontWeight: 'bold' }), []);

  return (
    <View style={styles.root} onLayout={(e) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {layers('back')}
            <StemLayers path={stemPath} light={light} />
            {layers('front')}
            {layers('label')}
            {rail.map((r, i) => (
              <DateTick key={'d' + i} wy={r.wy} month={r.month} year={r.year} scrollY={scrollY} font={railFont} top={top} />
            ))}
            <StickyTick wy={nowWy} text="NOW" scrollY={scrollY} font={railFont} lo={nowTop} hi={height - 84} now width={width} />
            <StickyTick wy={stemBottom} text="Day one" scrollY={scrollY} font={railFont} lo={top} hi={height - 84} width={width} color="#a9abb4" />
          </Canvas>
        </View>
      </GestureDetector>
      <GestureDetector gesture={scrub}>
        <View style={[styles.rail, { top: trackTop - 8, height: trackH + 16 }]}>
          <View style={styles.track} />
          <Animated.View style={[styles.thumb, thumb]} />
        </View>
      </GestureDetector>
      {yearsUI && (
        <View pointerEvents="none" style={[styles.years, { top: trackTop - 8, height: trackH + 16 }]}>
          {yearList.map((y, i) => (
            <View key={y.year} style={[styles.yearBox, { top: 8 + (yearList.length > 1 ? (i / (yearList.length - 1)) * (trackH - 18) : 0) - (actUI === i ? 8 : 0) }, actUI === i && styles.yearOn]}>
              <Text style={[styles.yearT, actUI === i && styles.yearTOn]}>{y.year}</Text>
            </View>
          ))}
        </View>
      )}
      {!compact && <View pointerEvents="none" style={styles.band} />}
      {!compact && (
        <View pointerEvents="none" style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub} numberOfLines={2}>{subtitle}</Text>
        </View>
      )}
    </View>
  );
}

export const Lane = React.memo(LaneImpl);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  rail: { position: 'absolute', left: 0, width: 34 },
  track: { position: 'absolute', left: 3, top: 8, bottom: 8, width: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  thumb: { position: 'absolute', left: 1, width: 6, height: 36, borderRadius: 3, backgroundColor: 'rgba(255,180,168,0.7)' },
  years: { position: 'absolute', left: 0, width: 84, backgroundColor: 'rgba(20,20,22,0.82)', borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  yearBox: { position: 'absolute', left: 8, paddingHorizontal: 6, borderRadius: 10, minWidth: 46 },
  yearOn: { backgroundColor: '#c93b3b', left: 6, paddingVertical: 2 },
  yearT: { color: '#ffc9bf', fontSize: 12, fontWeight: '800' },
  yearTOn: { color: '#fff', fontSize: 19 },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: 168, backgroundColor: COLORS.bg, opacity: 0.94 },
  header: { position: 'absolute', top: 102, left: 58, right: 120 },
  brand: { color: '#fff', fontSize: 20, fontWeight: '700' },
  title: { color: '#ffb4a8', fontSize: 13, fontWeight: '600', marginTop: 2 },
  sub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
});

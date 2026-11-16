import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Canvas, Group, Text as SkText, matchFont } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, runOnJS, useFrameCallback } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { cosmosLayout, cosPos, wrapTitle } from './layout';
import { Orb } from './Orb';

const FAMILY = Platform.select({ ios: 'Helvetica', default: 'sans-serif' }) as string;
type C = { hi: string; base: string; dark: string };

function Label({ text, font }: { text: string; font: any }) {
  const lines = wrapTitle(text);
  const lh = 12;
  const y0 = -((lines.length - 1) * lh) / 2 + 4;
  return (
    <>
      {lines.map((l, k) => (
        <SkText key={k} x={-font.measureText(l).width / 2} y={y0 + k * lh} text={l} font={font} color="#ffffff" />
      ))}
    </>
  );
}

function Bud({ spec, rot, colors, label, font, light }: any) {
  const t = useDerivedValue(() => {
    const p = cosPos(spec, rot.value);
    return [{ translateX: p.x }, { translateY: p.y }];
  });
  return (
    <Group transform={t}>
      <Orb r={spec.sr} colors={colors} light={light} />
      <Label text={label} font={font} />
    </Group>
  );
}

// A cluster of bubbles round one main bubble. Drifts slowly; drag to turn it, and a moment after you let go it drifts again.
// Tapping a bubble calls onPick with its label, or '__main' for the middle one.
export function Cosmos({ id, title, labels, colors, mainColors, R, height, cy, onPick, paused }: {
  id: string; title: string; labels: string[]; colors: C; mainColors?: C; R: number; height: number; cy: number; onPick: (label: string) => void; paused?: boolean;
}) {
  const { width } = useWindowDimensions();
  const cx = width / 2;
  const laid = useMemo(() => cosmosLayout(id, labels, R, width / 2), [id, labels, R, width]);
  const specs = laid.specs;
  const Rm = laid.R;
  const font = useMemo(() => matchFont({ fontFamily: FAMILY, fontSize: 10, fontWeight: 'bold' }), []);
  const light = useSharedValue(-0.4);
  const dir = 1; // always clockwise
  const rot = useSharedValue(0);
  const lastTouch = useSharedValue(0);
  const fc = useFrameCallback((fi) => {
    const dt = fi.timeSincePreviousFrame ?? 16;
    if (Date.now() - lastTouch.value > 1500) rot.value += dir * dt * 0.000035;
  });
  React.useEffect(() => { fc.setActive(!paused); }, [paused]);

  const tap = Gesture.Tap().onEnd((e, ok) => {
    if (!ok) return;
    let best = -1;
    let bd = 1e9;
    for (let j = 0; j < specs.length; j++) {
      const sp = specs[j];
      const q = cosPos(sp, rot.value);
      const dx = e.x - (cx + q.x);
      const dy = e.y - (cy + q.y);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < sp.sr + 8 && d < bd) { bd = d; best = j; }
    }
    const dm = Math.sqrt((e.x - cx) * (e.x - cx) + (e.y - cy) * (e.y - cy));
    if (dm < Rm) runOnJS(onPick)('__main');
    else if (best >= 0) runOnJS(onPick)(labels[best]);
    else runOnJS(onPick)('__none');
  });

  const pan = Gesture.Pan()
    .onBegin(() => { lastTouch.value = Date.now(); })
    .onChange((e) => {
      const a1 = Math.atan2(e.y - cy, e.x - cx);
      const a0 = Math.atan2(e.y - e.changeY - cy, e.x - e.changeX - cx);
      let d = a1 - a0;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      rot.value += d;
      lastTouch.value = Date.now();
    })
    .onEnd(() => { lastTouch.value = Date.now(); });
  const gesture = Gesture.Race(tap, pan);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Group transform={[{ translateX: cx }, { translateY: cy }]}>
            {specs.map((sp, j) => (
              <Bud key={j} spec={sp} rot={rot} colors={colors} label={labels[j]} font={font} light={light} />
            ))}
            <Orb r={Rm} colors={mainColors || colors} light={light} />
            <Label text={title} font={font} />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

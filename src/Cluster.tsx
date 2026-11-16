import React from 'react';
import { Group, Text as SkText } from '@shopify/react-native-skia';
import type { SkFont } from '@shopify/react-native-skia';
import { useDerivedValue, SharedValue } from 'react-native-reanimated';
import { paletteOf, posAt, laneLines } from './layout';
import type { EventItem } from './data';
import { Orb } from './Orb';

type Spec = { sr: number; ring: number; a0: number; w: number; tuck?: boolean };
type G = { r: number; D: number; beta: number; ext: number; specs: Spec[]; dir: number };

function Bud({ spec, dir, clock, colors, light }: { spec: Spec; dir: number; clock: SharedValue<number>; colors: any; light: SharedValue<number> }) {
  const t = useDerivedValue(() => {
    const a = spec.a0 + dir * clock.value * Math.PI * 2 + 0.3 * Math.sin(clock.value * Math.PI * 4 + spec.w);
    const rr = spec.ring * (spec.tuck ? 1 : 1 + 0.08 * Math.sin(clock.value * Math.PI * 6 + spec.w));
    return [{ translateX: rr * Math.cos(a) }, { translateY: rr * Math.sin(a) }];
  });
  return (
    <Group transform={t}>
      <Orb r={spec.sr} colors={colors} light={light} />
    </Group>
  );
}

export type ClusterProps = {
  ev: EventItem; wy: number; g: G; width: number;
  scrollY: SharedValue<number>; phase: SharedValue<number>; clock: SharedValue<number>; light: SharedValue<number>;
  layer: 'back' | 'front' | 'label'; font: SkFont; dateFont?: SkFont; top?: number;
};

const ALPHA = 0.86;

const fadeTop = (y: number, top: number) => {
  'worklet';
  return y < top ? Math.max(0, (y - (top - 50)) / 50) : 1;
};

function ClusterImpl({ ev, wy, g, width, scrollY, phase, clock, light, layer, font, dateFont, top = 120 }: ClusterProps) {
  const colors = paletteOf(ev);
  const pos = useDerivedValue(() => posAt(wy, scrollY.value, phase.value, g, width));
  const transform = useDerivedValue(() => [{ translateX: pos.value.x }, { translateY: pos.value.y }, { scale: pos.value.s }]);
  const opacity = useDerivedValue(() => {
    const p = pos.value;
    const fade = fadeTop(p.y, top);
    if (layer === 'back') return p.zz < 0 ? fade * ALPHA * 0.8 : 0;
    return p.zz >= 0 ? fade * ALPHA : 0;
  });

  if (layer === 'label') {
    const lines = laneLines(ev.title);
    const subL = ev.sub ? ev.sub.split(' ') : [];
    const lh = 11.5;
    const y0 = -((lines.length + subL.length - 1) * lh) / 2 + 3.5;
    // The name sits on the bubble's outer face. It fades and squeezes as the bubble turns behind the stem,
    // and starts to appear again once the bubble has come round the other side.
    const f = useDerivedValue(() => {
      // Full name while the bubble is in front. It only starts to fade once the bubble turns behind the stem.
      // A bubble that has swung far from the stem is never hidden by it, so its name stays: the name only fades while the stem covers it.
      const t = (pos.value.zz + 0.45) / 0.53;
      const c0 = Math.min(1, Math.max(0, t));
      const c = c0 * c0 * (3 - 2 * c0);
      const n0 = Math.min(1, Math.max(0, (Math.abs(pos.value.dx) - 6) / (g.r + 14)));
      const near = 1 - n0 * n0 * (3 - 2 * n0);
      return c + (1 - c) * (1 - near);
    });
    const lt = useDerivedValue(() => {
      const p = pos.value;
      const sh = p.away * g.r * 0.5 * (1 - f.value);
      return [{ translateX: p.x + sh }, { translateY: p.y }, { scale: p.s }, { scaleX: 0.7 + 0.3 * f.value }];
    });
    const lo = useDerivedValue(() => fadeTop(pos.value.y, top) * f.value);
    return (
      <Group transform={lt} opacity={lo}>
        {lines.map((l, k) => (
          <SkText key={k} x={-font.measureText(l).width / 2} y={y0 + k * lh} text={l} font={font} color="#ffffff" />
        ))}
        {subL.map((l, k) => (
          <SkText key={'s' + k} x={-font.measureText(l).width / 2} y={y0 + (lines.length + k) * lh} text={l} font={font} color="rgba(255,255,255,0.72)" />
        ))}
      </Group>
    );
  }
  return (
    <Group transform={transform} opacity={opacity}>
      {g.specs.map((s, j) => (s.tuck ? null : <Bud key={j} spec={s} dir={g.dir} clock={clock} colors={colors} light={light} />))}
      <Orb r={g.r} colors={colors} light={light} />
      {g.specs.map((s, j) => (s.tuck ? <Bud key={j} spec={s} dir={g.dir} clock={clock} colors={colors} light={light} /> : null))}
    </Group>
  );
}

export const Cluster = React.memo(ClusterImpl);

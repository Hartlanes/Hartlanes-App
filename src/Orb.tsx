import React from 'react';
import { Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import { useDerivedValue, SharedValue } from 'react-native-reanimated';

type C = { hi: string; base: string; dark: string };

// A lit sphere. `light` is a value between -1 and 1 that slides the highlight sideways when you scroll or rotate.
export function Orb({ r, colors, light }: { r: number; colors: C; light?: SharedValue<number> }) {
  const c = useDerivedValue(() => vec(-r * 0.2 + (light ? light.value * r * 0.3 : -r * 0.12), -r * 0.38));
  const g = useDerivedValue(() => vec(-r * 0.28 + (light ? light.value * r * 0.38 : -r * 0.1), -r * 0.46));
  return (
    <>
      <Circle cx={0} cy={0} r={r}>
        <RadialGradient c={c} r={r * 1.25} colors={[colors.hi, colors.base, colors.dark]} positions={[0, 0.45, 1]} />
      </Circle>
      <Circle c={g} r={r * 0.16} color="rgba(255,255,255,0.55)" />
    </>
  );
}

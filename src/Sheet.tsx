import React, { useMemo, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Every pull-up sheet in the app uses this one handle. The sheet follows the finger while you drag, and on release it
// snaps to its normal size or to full height. Full height stops just under the logo, search and menu strip.
export const SHEET_TOP = 96;

export function DragSheet({ bottom, maxAuto, style, children }: {
  bottom: number; maxAuto: number; style?: ViewStyle; children: (p: { expanded: boolean; maxAuto: number }) => React.ReactNode;
}) {
  const win = useWindowDimensions();
  const fullH = Math.max(240, win.height - SHEET_TOP - bottom);
  const [full, setFull] = useState(false);
  const [drag, setDrag] = useState(false);
  const measured = useSharedValue(300);
  const startH = useSharedValue(0);
  const override = useSharedValue(-1);
  const finish = useCallback((up: boolean) => { setFull(up); setDrag(false); }, []);
  const pan = useMemo(() => Gesture.Pan()
    .activeOffsetY([-5, 5])
    .onBegin(() => { startH.value = full ? fullH : measured.value; })
    .onStart(() => { runOnJS(setDrag)(true); override.value = startH.value; })
    .onUpdate((e) => { override.value = Math.min(fullH, Math.max(160, startH.value - e.translationY)); })
    .onEnd((e) => {
      const h = override.value;
      const up = e.velocityY < -600 ? true : e.velocityY > 600 ? false : h > (fullH + Math.min(measured.value, fullH)) / 2 || (full && h > fullH - 60);
      override.value = -1;
      runOnJS(finish)(up);
    }), [full, fullH, finish]);
  const aStyle = useAnimatedStyle(() => (override.value >= 0 ? { height: override.value, maxHeight: 10000 } : {}));
  const expanded = full || drag;
  return (
    <Animated.View
      onLayout={(e) => { if (!full) measured.value = e.nativeEvent.layout.height; }}
      style={[s.box, { bottom }, style, full && { height: fullH, maxHeight: fullH }, aStyle]}
    >
      <GestureDetector gesture={pan}>
        <View style={s.handleBox} collapsable={false}>
          <Pressable onPress={() => setFull((f) => !f)} hitSlop={{ top: 12, bottom: 12, left: 70, right: 70 }} style={s.handleHit}>
            <View style={s.handle} />
          </Pressable>
        </View>
      </GestureDetector>
      <View style={expanded ? { flex: 1, minHeight: 0 } : undefined}>{children({ expanded, maxAuto })}</View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  box: { position: 'absolute', left: 0, right: 0, backgroundColor: '#26272b', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingBottom: 12, overflow: 'hidden' },
  handleBox: { height: 30, alignItems: 'center', justifyContent: 'center' },
  handleHit: { width: 120, height: 30, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
});

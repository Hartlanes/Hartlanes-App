import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

// Height of the on-screen keyboard (0 when hidden). Android does not resize the window here, so screens lift themselves by this much.
export function useKeyboard() {
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const b = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  return kb;
}

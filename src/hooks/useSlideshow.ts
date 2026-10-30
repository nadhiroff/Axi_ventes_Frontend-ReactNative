import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, AppState, type FlatList } from 'react-native';

/**
 * Défilement automatique des photos, partout dans l'application, sans alourdir :
 * UNE seule minuterie pour toute l'app (pas une par photo), arrêtée quand plus rien ne défile ou que
 * l'application passe en arrière-plan. Chaque écran caché (sous un autre) ne change plus ses photos,
 * donc rien n'est téléchargé pour rien.
 */
const TICK_MS = 3500;
let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let appActive = AppState.currentState === 'active';
const listeners = new Set<(n: number) => void>();

function sync() {
  const run = appActive && listeners.size > 0;
  if (run && !timer) {
    timer = setInterval(() => {
      tick += 1;
      listeners.forEach((l) => l(tick));
    }, TICK_MS);
  } else if (!run && timer) {
    clearInterval(timer);
    timer = null;
  }
}

AppState.addEventListener('change', (state) => {
  appActive = state === 'active';
  sync();
});

function useTick(enabled: boolean, onTick: (n: number) => void) {
  const focused = useIsFocused();
  const cb = useRef(onTick);
  useEffect(() => {
    cb.current = onTick;
  });
  useEffect(() => {
    if (!enabled || !focused) return;
    const l = (n: number) => cb.current(n);
    listeners.add(l);
    sync();
    return () => {
      listeners.delete(l);
      sync();
    };
  }, [enabled, focused]);
}

/** « Réduire les animations » du téléphone : la photo change sans glissement ni fondu */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/**
 * Vignette à plusieurs photos : index de la photo à montrer. « seed » décale chaque vignette pour que
 * toute la grille ne change pas d'un coup ; seules les « max » premières photos tournent (données mobiles).
 */
export function useSlideIndex(count: number, seed: string, max = 3): number {
  const n = Math.min(count, max);
  const offset = [...seed].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const [index, setIndex] = useState(0);
  useTick(n > 1, (t) => {
    // Une vignette sur deux avance à chaque battement : la grille bouge doucement, pas en bloc
    if ((t + offset) % 2 === 0) setIndex((i) => (i + 1) % n);
  });
  return n > 1 ? index % n : 0;
}

/**
 * Carrousel qu'on fait aussi glisser au doigt : passe seul à la page suivante (retour au début à la fin),
 * attend un moment après un glissement. Renvoie onDrag à brancher sur onScrollBeginDrag, et setPage
 * à appeler quand la page change au doigt.
 */
export function useAutoPager<T>(list: RefObject<FlatList<T> | null>, count: number, step: number) {
  const reduce = useReduceMotion();
  const page = useRef(0);
  const pausedUntil = useRef(0);
  const [current, setCurrent] = useState(0);
  useTick(count > 1 && step > 0, () => {
    if (Date.now() < pausedUntil.current) return;
    const next = (page.current + 1) % count;
    list.current?.scrollToOffset({ offset: next * step, animated: !reduce });
    page.current = next;
    setCurrent(next);
  });
  return {
    page: current,
    onDrag: () => {
      pausedUntil.current = Date.now() + 8000;
    },
    setPage: (p: number) => {
      page.current = p;
      setCurrent(p);
    },
  };
}

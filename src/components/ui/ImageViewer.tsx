import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, PanResponder, Pressable, StatusBar, Text, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ApiImage } from '../../api/types';
import { useT } from '../../i18n';
import { useTheme } from '../../theme';
import { Icon } from './Icon';

type Props = { images: ApiImage[]; initialIndex?: number; visible: boolean; onClose: () => void; title?: string };

/** Ouverture plein écran d'une ou plusieurs photos : glisser pour changer, pincer ou toucher deux fois pour zoomer. */
export function ImageViewer({ images, initialIndex = 0, visible, onClose, title }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: colors.overlay }}>{visible ? <Gallery key={initialIndex} images={images} initialIndex={initialIndex} onClose={onClose} title={title} /> : null}</View>
    </Modal>
  );
}

/** Contenu monté à chaque ouverture : la photo de départ et le zoom repartent de zéro. */
function Gallery({ images, initialIndex, onClose, title }: { images: ApiImage[]; initialIndex: number; onClose: () => void; title?: string }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = useT();
  const start = Math.min(initialIndex, Math.max(images.length - 1, 0));
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(img, i) => `${img.medium_url}-${i}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <ZoomableImage image={item} width={width} height={height} onZoomChange={setZoomed} />}
      />
      <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
          {title ?? ''}
        </Text>
        {images.length > 1 ? <Text style={{ color: '#FFFFFF', fontSize: 15 }}>{`${index + 1} / ${images.length}`}</Text> : null}
      </View>
      <Text style={{ position: 'absolute', bottom: insets.bottom + 16, alignSelf: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{t('viewer.hint')}</Text>
    </>
  );
}

const MAX_SCALE = 4;

type Gesture = { scale: number; x: number; y: number; startScale: number; startDist: number; startX: number; startY: number; lastTap: number };

/** Photo zoomable : pincer à deux doigts, déplacer d'un doigt une fois zoomé, double toucher pour zoomer / revenir */
function ZoomableImage({ image, width, height, onZoomChange }: { image: ApiImage; width: number; height: number; onZoomChange: (zoomed: boolean) => void }) {
  // Valeurs animées et état du geste créés une seule fois (lus seulement dans les gestionnaires d'événements)
  const [anim] = useState(() => ({ scale: new Animated.Value(1), tx: new Animated.Value(0), ty: new Animated.Value(0) }));
  // État du geste et dimensions courantes : lus et modifiés seulement dans les gestionnaires d'événements
  const gestureRef = useRef<Gesture>({ scale: 1, x: 0, y: 0, startScale: 1, startDist: 0, startX: 0, startY: 0, lastTap: 0 });
  const sizeRef = useRef({ width, height, onZoomChange });
  useEffect(() => {
    sizeRef.current = { width, height, onZoomChange };
  }, [width, height, onZoomChange]);

  // Les refs ne sont lues que dans les gestionnaires du PanResponder (pendant un geste), jamais pendant le
  // rendu ; le compilateur React ne sait pas distinguer ces fermetures, d'où l'exception ci-dessous.
  // eslint-disable-next-line react-hooks/refs
  const [handlers] = useState(() => {
    const apply = (s: number, x: number, y: number, animate = false) => {
      const gesture = gestureRef.current;
      const size = sizeRef.current;
      gesture.scale = s;
      // Le déplacement reste dans les limites de la photo agrandie
      const maxX = ((s - 1) * size.width) / 2;
      const maxY = ((s - 1) * size.height) / 2;
      gesture.x = Math.max(-maxX, Math.min(maxX, x));
      gesture.y = Math.max(-maxY, Math.min(maxY, y));
      if (animate) {
        Animated.parallel([
          Animated.spring(anim.scale, { toValue: gesture.scale, useNativeDriver: true }),
          Animated.spring(anim.tx, { toValue: gesture.x, useNativeDriver: true }),
          Animated.spring(anim.ty, { toValue: gesture.y, useNativeDriver: true }),
        ]).start();
      } else {
        anim.scale.setValue(gesture.scale);
        anim.tx.setValue(gesture.x);
        anim.ty.setValue(gesture.y);
      }
      size.onZoomChange(gesture.scale > 1.01);
    };
    const distance = (e: GestureResponderEvent) => {
      const [a, b] = e.nativeEvent.touches;
      return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
    };
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2 || gestureRef.current.scale > 1.01,
      onMoveShouldSetPanResponder: (e, g) => e.nativeEvent.touches.length === 2 || (gestureRef.current.scale > 1.01 && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2)),
      onPanResponderGrant: (e) => {
        const gesture = gestureRef.current;
        gesture.startScale = gesture.scale;
        gesture.startDist = distance(e);
        gesture.startX = gesture.x;
        gesture.startY = gesture.y;
      },
      onPanResponderMove: (e, g) => {
        const gesture = gestureRef.current;
        if (e.nativeEvent.touches.length === 2) {
          const d = distance(e);
          if (gesture.startDist === 0) gesture.startDist = d;
          apply(Math.max(1, Math.min(MAX_SCALE, gesture.startScale * (d / Math.max(gesture.startDist, 1)))), gesture.startX, gesture.startY);
        } else if (gesture.scale > 1.01) {
          apply(gesture.scale, gesture.startX + g.dx, gesture.startY + g.dy);
        }
      },
      onPanResponderRelease: () => {
        if (gestureRef.current.scale < 1.05) apply(1, 0, 0, true);
      },
    });
    const onPress = () => {
      const gesture = gestureRef.current;
      const now = Date.now();
      if (now - gesture.lastTap < 280) apply(gesture.scale > 1.01 ? 1 : 2.5, 0, 0, true);
      gesture.lastTap = now;
    };
    return { pan: responder.panHandlers, onPress };
  });

  return (
    <Pressable onPress={handlers.onPress} style={{ width, height, alignItems: 'center', justifyContent: 'center' }} {...handlers.pan}>
      <Animated.View style={{ width, height, transform: [{ translateX: anim.tx }, { translateY: anim.ty }, { scale: anim.scale }] }}>
        <Image source={{ uri: image.medium_url }} placeholder={{ uri: image.thumb_url }} contentFit="contain" style={{ width: '100%', height: '100%' }} cachePolicy="memory-disk" />
      </Animated.View>
    </Pressable>
  );
}

import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { errorMessage, type LocalFile } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useCreateProduct } from '../../hooks/api/merchant';
import { takeProductPhoto } from '../../hooks/useProductPhoto';
import { colors, fontSize, radius, spacing } from '../../theme';

/** Ajout d'un produit : la photo d'abord (ouverte tout de suite), puis le nom et le prix. */
export default function NewProductScreen() {
  const createProduct = useCreateProduct();
  const [photo, setPhoto] = useState<LocalFile | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [isToday, setIsToday] = useState(true);

  const pick = async (source: 'camera' | 'library') => {
    const file = await takeProductPhoto(source);
    if (file) setPhoto(file);
  };

  // L'appareil photo s'ouvre dès l'arrivée sur l'écran : un geste de moins.
  useEffect(() => {
    let active = true;
    takeProductPhoto('camera').then((file) => {
      if (active && file) setPhoto(file);
    });
    return () => {
      active = false;
    };
  }, []);

  const amount = Number(price.replace(/\D/g, ''));
  const canSave = !!photo && name.trim().length >= 2 && (negotiable || amount > 0);

  const save = () => {
    if (!photo) return;
    createProduct.mutate(
      { name: name.trim(), price: negotiable ? null : amount, isToday, photo },
      {
        onSuccess: () => {
          Alert.alert('Produit ajouté', 'Il est visible sur votre étal.');
          router.back();
        },
        onError: (e) => Alert.alert('Envoi impossible', errorMessage(e)),
      },
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Nouveau produit" subtitle="Photo réduite avant l’envoi pour économiser la data" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => pick('camera')} style={styles.photo} accessibilityRole="button" accessibilityLabel="Prendre la photo">
          {photo ? (
            <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <>
              <Icon name="camera" size={36} color={colors.brand} />
              <Text style={styles.photoText}>Prendre la photo</Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={() => pick('library')} style={styles.library} accessibilityRole="button">
          <Icon name="image" size={18} color={colors.brand} />
          <Text style={styles.libraryText}>Choisir dans la galerie</Text>
        </Pressable>

        <Text style={styles.label}>Nom du produit</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex. Wax hollandais, 6 yards"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Prix</Text>
        <View style={[styles.priceRow, negotiable && { opacity: 0.4 }]}>
          <TextInput
            value={price}
            onChangeText={setPrice}
            editable={!negotiable}
            keyboardType="number-pad"
            placeholder="18000"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { flex: 1 }]}
          />
          <Text style={styles.currency}>FCFA</Text>
        </View>

        <SwitchRow label="Prix à débattre" value={negotiable} onChange={setNegotiable} />
        <SwitchRow label="Disponible aujourd’hui" value={isToday} onChange={setIsToday} />

        <Button label="Mettre en vente" size="lg" onPress={save} disabled={!canSave} loading={createProduct.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.border }}
        thumbColor={colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  photo: {
    aspectRatio: 1.4,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: spacing.sm,
  },
  photoText: { fontSize: fontSize.title, fontWeight: '600', color: colors.brand },
  library: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'center', padding: spacing.sm },
  libraryText: { fontSize: fontSize.body, color: colors.brand, fontWeight: '600' },
  label: { fontSize: fontSize.small, fontWeight: '600', color: colors.textMuted, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.title,
    color: colors.text,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  currency: { fontSize: fontSize.title, color: colors.textMuted, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontSize: fontSize.body, color: colors.text, fontWeight: '500' },
});

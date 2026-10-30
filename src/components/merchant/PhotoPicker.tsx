import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { LocalFile } from "../../api/client";
import { pickPhotos, takeProductPhoto } from "../../hooks/useProductPhoto";
import { useT } from "../../i18n";
import { fontSize, makeStyles, radius, spacing } from "../../theme";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

/**
 * Photos d'un produit (jusqu'à 5) : appareil photo une par une, ou galerie avec plusieurs photos d'un coup.
 * Réduites à 1080 px en WebP sur le téléphone avant l'envoi.
 */
export function PhotoPicker({
  photos,
  onChange,
  max = 5,
}: {
  photos: LocalFile[];
  onChange: (photos: LocalFile[]) => void;
  max?: number;
}) {
  const styles = useStyles();
  const t = useT();
  const pick = async (source: "camera" | "library") => {
    if (source === "library") {
      const picked = await pickPhotos(max - photos.length);
      if (picked.length) onChange([...photos, ...picked].slice(0, max));
      return;
    }
    const photo = await takeProductPhoto(source);
    if (photo) onChange([...photos, photo].slice(0, max));
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>
        {t("merchant.photos")}
        {photos.length ? ` · ${photos.length}/${max}` : ""}
      </Text>
      {photos.length ? (
        <View style={styles.grid}>
          {photos.map((p, i) => (
            <View key={p.uri} style={styles.thumb}>
              <Image
                source={{ uri: p.uri }}
                style={styles.img}
                contentFit="cover"
              />
              <Pressable
                onPress={() => onChange(photos.filter((_, k) => k !== i))}
                accessibilityRole="button"
                accessibilityLabel={t("cart.remove")}
                style={styles.remove}
                hitSlop={6}
              >
                <Icon name="x" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {photos.length < max ? (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button
            label={t("common.camera")}
            icon="camera"
            variant="ghost"
            size="sm"
            onPress={() => pick("camera")}
            style={{ flex: 1 }}
          />
          <Button
            label={t("common.gallery")}
            icon="image"
            variant="ghost"
            size="sm"
            onPress={() => pick("library")}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: fontSize.small, fontWeight: "600", color: c.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: c.surfaceAlt,
  },
  img: { width: 88, height: 88 },
  remove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
}));

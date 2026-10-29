import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { StallCard } from '../../components/client/StallCard';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useAisle } from '../../hooks/api/client';
import { colors, spacing } from '../../theme';

/** Les étals d'une allée. */
export default function AisleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const aisle = useAisle(id);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={aisle.data?.aisle.name ?? 'Allée'}
        subtitle={aisle.data ? `${aisle.data.aisle.stall_count} étals` : undefined}
      />
      {aisle.isPending ? (
        <LoadingView />
      ) : aisle.isError && !aisle.data ? (
        <ErrorView error={aisle.error} onRetry={() => aisle.refetch()} />
      ) : (
        <FlatList
          data={aisle.data!.stalls}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <StallCard stall={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={<EmptyView icon="grid" title="Aucun étal en ligne dans cette allée pour l’instant" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl },
});

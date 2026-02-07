/**
 * CareMap Mobile — Provider Demo Screen
 * ======================================
 *
 * Demo screen for testing provider search functionality.
 * Shows plan picker, search input, source buttons, and results list.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useProviderSearch } from "../hooks/useProviderSearch";
import { usePlans } from "../hooks/usePlans";
import type { Provider, ProviderSearchRequest } from "../types/contracts";

// =============================================================================
// Network Badge Component
// =============================================================================

interface NetworkBadgeProps {
  provider: Provider;
}

function NetworkBadge({ provider }: NetworkBadgeProps) {
  const status = provider.network_status;

  if (!status) {
    return (
      <View style={[styles.badge, styles.badgeUnknown]}>
        <Text style={styles.badgeText}>Unknown</Text>
      </View>
    );
  }

  if (status.in_network) {
    return (
      <View style={[styles.badge, styles.badgeIn]}>
        <Text style={styles.badgeText}>In-Network</Text>
        <Text style={styles.badgeConfidence}>
          {Math.round(status.confidence * 100)}%
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.badgeOut]}>
      <Text style={styles.badgeText}>Out-of-Network</Text>
      <Text style={styles.badgeConfidence}>
        {Math.round(status.confidence * 100)}%
      </Text>
    </View>
  );
}

// =============================================================================
// Provider Card Component
// =============================================================================

interface ProviderCardProps {
  provider: Provider;
}

function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {provider.name}
        </Text>
        <NetworkBadge provider={provider} />
      </View>

      <Text style={styles.cardAddress}>
        {provider.address.line1}, {provider.address.city}, {provider.address.state}
      </Text>

      <View style={styles.cardFooter}>
        {provider.distance_miles !== undefined && (
          <Text style={styles.cardDistance}>
            {provider.distance_miles.toFixed(1)} mi
          </Text>
        )}
        {provider.specialties && provider.specialties.length > 0 && (
          <Text style={styles.cardSpecialty} numberOfLines={1}>
            {provider.specialties[0].replace(/_/g, " ")}
          </Text>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// Main Screen
// =============================================================================

export function ProviderDemoScreen() {
  // State
  const [query, setQuery] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Hooks
  const { plans, loading: plansLoading } = usePlans({ autoFetch: true });
  const {
    providers,
    loading: searchLoading,
    error,
    meta,
    search,
  } = useProviderSearch();

  // Search handler
  const handleSearch = (source: ProviderSearchRequest["source"]) => {
    search({
      q: query || undefined,
      source,
      plan_id: selectedPlanId ?? undefined,
      lat: 40.4406,
      lng: -79.9959,
      radius_miles: 15,
      limit: 20,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ CareMap</Text>
        <Text style={styles.subtitle}>Provider Search Demo</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Plan Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Insurance Plan</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.planPicker}
          >
            <TouchableOpacity
              style={[
                styles.planChip,
                !selectedPlanId && styles.planChipSelected,
              ]}
              onPress={() => setSelectedPlanId(null)}
            >
              <Text
                style={[
                  styles.planChipText,
                  !selectedPlanId && styles.planChipTextSelected,
                ]}
              >
                None
              </Text>
            </TouchableOpacity>
            {plans.slice(0, 5).map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planChip,
                  selectedPlanId === plan.id && styles.planChipSelected,
                ]}
                onPress={() => setSelectedPlanId(plan.id)}
              >
                <Text
                  style={[
                    styles.planChipText,
                    selectedPlanId === plan.id && styles.planChipTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {plan.payer}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Search Query (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., cardiologist, urgent care..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Source Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonMock]}
            onPress={() => handleSearch("mock")}
            disabled={searchLoading}
          >
            <Text style={styles.buttonText}>Mock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonCache]}
            onPress={() => handleSearch("cache")}
            disabled={searchLoading}
          >
            <Text style={styles.buttonText}>Cache</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonPlaces]}
            onPress={() => handleSearch("places")}
            disabled={searchLoading}
          >
            <Text style={styles.buttonText}>Places</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      <View style={styles.results}>
        {/* Status Bar */}
        {meta && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              {meta.returned} of {meta.total} providers • {meta.source_used}
            </Text>
          </View>
        )}

        {/* Loading */}
        {searchLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4ecdc4" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* Error */}
        {error && !searchLoading && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Empty State */}
        {!searchLoading && !error && providers.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              No providers found.{"\n"}Try a different search or source.
            </Text>
          </View>
        )}

        {/* Provider List */}
        {!searchLoading && providers.length > 0 && (
          <FlatList
            data={providers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ProviderCard provider={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  controls: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4e",
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planPicker: {
    flexDirection: "row",
  },
  planChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#2a2a4e",
    borderRadius: 20,
    marginRight: 8,
  },
  planChipSelected: {
    backgroundColor: "#4ecdc4",
  },
  planChipText: {
    fontSize: 13,
    color: "#aaa",
    fontWeight: "500",
  },
  planChipTextSelected: {
    color: "#1a1a2e",
  },
  input: {
    backgroundColor: "#2a2a4e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#fff",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonMock: {
    backgroundColor: "#6c5ce7",
  },
  buttonCache: {
    backgroundColor: "#00b894",
  },
  buttonPlaces: {
    backgroundColor: "#e17055",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  results: {
    flex: 1,
  },
  statusBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#2a2a4e",
  },
  statusText: {
    fontSize: 12,
    color: "#888",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#888",
  },
  errorText: {
    fontSize: 14,
    color: "#ff6b6b",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#2a2a4e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  cardAddress: {
    fontSize: 13,
    color: "#888",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardDistance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4ecdc4",
    marginRight: 12,
  },
  cardSpecialty: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeIn: {
    backgroundColor: "rgba(0, 184, 148, 0.2)",
  },
  badgeOut: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
  },
  badgeUnknown: {
    backgroundColor: "rgba(136, 136, 136, 0.2)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  badgeConfidence: {
    fontSize: 9,
    color: "#888",
    marginLeft: 4,
  },
});

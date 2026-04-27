import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { api } from "../lib/api";

export default function Index() {
  const health = api.useQuery("api/health", "$get", {});

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      {health.isLoading ? (
        <ActivityIndicator />
      ) : health.isError ? (
        <Text>API Error</Text>
      ) : (
        <Text>API Status: {(health.data as any)?.data?.status}</Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
});

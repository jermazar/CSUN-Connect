import { View, Text, Pressable } from "react-native";
export function EventCard({ title, date, onPress }: { title: string; date: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={{ padding: 16, borderRadius: 16, borderWidth: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600" }}>{title}</Text>
        <Text>{new Date(date).toLocaleString()}</Text>
      </View>
    </Pressable>
  );
}

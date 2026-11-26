import React from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  style?: ViewStyle;
}

export default function SearchBar({
  placeholder = "Поиск",
  value = "",
  onChangeText,
  onSubmitEditing,
  style,
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <FontAwesome
        name="search"
        size={18}
        color={COLORS.textLight}
        style={styles.searchIcon}
      />

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
      />

      {!!value && (
        <Pressable
          onPress={() => onChangeText?.("")}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityLabel="Очистить поиск"
          accessibilityRole="button"
        >
          <FontAwesome name="times-circle" size={16} color={COLORS.textLight} />
        </Pressable>
      )}

      {!!value && (
        <Pressable
          onPress={onSubmitEditing}
          style={styles.sendBtn}
          accessibilityLabel="Найти"
          accessibilityRole="button"
        >
          <FontAwesome6 name="paper-plane" size={15} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 0,
    fontFamily: "Inter_400Regular",
  },
  clearBtn: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 2,
  },
});

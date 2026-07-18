import { Card, H2, Paragraph, Text, YStack, useTheme } from "tamagui";

export function MissingInstantConfig() {
  const theme = useTheme();

  return (
    <YStack
      style={{
        width: "100%",
        minHeight: "var(--app-viewport-height)",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        backgroundColor: theme.canvas.val,
      }}
    >
      <Card
        width="100%"
        maxWidth={540}
        style={{
          borderWidth: 1,
          borderColor: theme.borderDefault.val,
          backgroundColor: theme.surface.val,
          boxShadow: "0 16px 34px rgba(20, 12, 38, 0.12)",
        }}
      >
        <Card.Header style={{ padding: "1.25rem" }}>
          <YStack gap="$3">
            <Text
              style={{
                fontSize: 12,
                letterSpacing: 2.1,
                textTransform: "uppercase",
                color: theme.textSecondary.val,
              }}
            >
              InstantDB setup
            </Text>
            <H2 style={{ margin: 0, color: theme.textInk.val }}>
              App ID is missing
            </H2>
            <Paragraph style={{ margin: 0, color: theme.textSecondary.val }}>
              Add your InstantDB app ID in
              <Text style={{ fontFamily: "monospace", color: theme.textPrimary.val }}>
                {" "}apps/web/.env.local
              </Text>{" "}
              and reload the dev server.
            </Paragraph>
            <YStack
              gap="$2"
              style={{
                backgroundColor: theme.overlay.val,
                border: `1px solid ${theme.borderSubtle.val}`,
                borderRadius: 12,
                padding: "0.9rem",
              }}
            >
              <Text style={{ fontFamily: "monospace", color: theme.textPrimary.val }}>
                VITE_INSTANT_APP_ID=...
              </Text>
            </YStack>
          </YStack>
        </Card.Header>
      </Card>
    </YStack>
  );
}

// Keep old export name for backwards compatibility with App.tsx import
export { MissingInstantConfig as MissingSupabaseConfig };

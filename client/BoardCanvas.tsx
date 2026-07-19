import { useSync } from "@tldraw/sync";
import { useTldrawCurrentUser } from "@tldraw/editor";
import { useMemo } from "react";
import { Tldraw } from "tldraw";
import type { BoardSummary, CurrentUser } from "./api";
import { createAssetStore } from "./assets";
import { getBookmarkPreview } from "./bookmarks";

type BoardCanvasProps = {
  board: BoardSummary;
  user: CurrentUser;
};

export function BoardCanvas({ board, user }: BoardCanvasProps) {
  const assets = useMemo(() => createAssetStore(board.id), [board.id]);
  const currentUser = useTldrawCurrentUser({
    userPreferences: {
      id: user.id,
      name: user.name,
      color: "#b44836",
    },
  });
  const store = useSync({
    uri: `${window.location.origin}/api/boards/${encodeURIComponent(board.id)}/connect`,
    assets,
  });

  return (
    <div className="canvas-frame">
      <Tldraw
        store={store}
        user={currentUser}
        options={{ deepLinks: true }}
        onMount={(editor) => {
          editor.registerExternalAssetHandler("url", ({ url }) =>
            getBookmarkPreview(board.id, url)
          );
        }}
      />
    </div>
  );
}

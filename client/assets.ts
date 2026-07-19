import { type TLAssetStore, uniqueId } from "tldraw";

export function createAssetStore(boardId: string): TLAssetStore {
  return {
    async upload(_asset, file) {
      const id = uniqueId();
      const objectName = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, "-");
      const url = `/api/boards/${encodeURIComponent(boardId)}/uploads/${objectName}`;
      const response = await fetch(url, {
        method: "POST",
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload asset: ${response.statusText}`);
      }

      return { src: url };
    },

    resolve(asset) {
      return asset.props.src;
    },
  };
}

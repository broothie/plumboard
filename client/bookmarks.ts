import {
  AssetRecordType,
  getHashForString,
  type TLAsset,
  type TLBookmarkAsset,
} from "tldraw";

export async function getBookmarkPreview(boardId: string, url: string): Promise<TLAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: "asset",
    type: "bookmark",
    meta: {},
    props: {
      src: url,
      description: "",
      image: "",
      favicon: "",
      title: "",
    },
  };

  try {
    const response = await fetch(
      `/api/boards/${encodeURIComponent(boardId)}/unfurl?url=${encodeURIComponent(url)}`,
    );
    const data = await response.json() as Partial<TLBookmarkAsset["props"]>;
    asset.props.description = data.description ?? "";
    asset.props.image = data.image ?? "";
    asset.props.favicon = data.favicon ?? "";
    asset.props.title = data.title ?? "";
  } catch (error) {
    console.error("Could not load bookmark preview", error);
  }

  return asset;
}

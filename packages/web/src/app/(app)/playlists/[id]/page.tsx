import { PlaylistDetail } from "@/components/playlist-detail";

type PageProps = { params: Promise<{ id: string }> };

export default async function PlaylistPage({ params }: PageProps) {
  const { id } = await params;
  return <PlaylistDetail playlistId={id} />;
}

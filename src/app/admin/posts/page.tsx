import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PostsManager } from "@/components/posts-manager";

export const dynamic = "force-dynamic";

export default function PostsPage() {
  const posts = db
    .select()
    .from(schema.posts)
    .orderBy(desc(schema.posts.createdAt))
    .all();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold tracking-tight">Posts</h1>
      <PostsManager posts={posts} />
    </div>
  );
}

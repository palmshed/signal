"use client";

import { useEffect, useRef } from "react";
import type { Post } from "@/lib/db/schema";
import { trackPostView } from "./track";
import { PostCard } from "./post-card";

export function TrackedPost({ post }: { post: Post }) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      fired.current = true;
      trackPostView(post.id);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !fired.current) {
          fired.current = true;
          trackPostView(post.id);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [post.id]);

  return (
    <div ref={ref}>
      <PostCard post={post} />
    </div>
  );
}

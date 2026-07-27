import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Clock, Eye, ChevronLeft, Loader2, Tag } from "lucide-react";

interface BlogPost {
  id:          string;
  slug:        string;
  title:       string;
  excerpt:     string;
  author_name: string;
  tags:        string[];
  cover_url:   string;
  views:       number;
  reading_min: number;
  created_at:  string;
  content?:    string;
}

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

export function BlogModal({ open, onOpenChange }: Props) {
  const [posts,    setPosts]    = useState<BlogPost[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [tag,      setTag]      = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "8", status: "published" });
    if (tag) params.set("tag", tag);
    fetch(`/api/blog/posts?${params}`)
      .then((r) => r.json())
      .then((d: { posts?: BlogPost[]; total?: number }) => {
        setPosts(d.posts ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, page, tag]);

  const openPost = async (slug: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/blog/posts/${slug}`);
      const post = await r.json() as BlogPost;
      setSelected(post);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onOpenChange(false)}
      >
        <motion.div
          className="relative w-full max-w-3xl bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
            <div className="flex items-center gap-3">
              {selected && (
                <button onClick={() => setSelected(null)} className="text-[#666] hover:text-white">
                  <ChevronLeft size={18} />
                </button>
              )}
              <BookOpen size={18} className="text-[#e21227]" />
              <span className="text-white font-semibold">{selected ? selected.title : "المدونة"}</span>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-[#666] hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={28} className="text-[#e21227] animate-spin" />
              </div>
            ) : selected ? (
              /* Single post view */
              <div className="p-6">
                <div className="flex items-center gap-4 text-xs text-[#555] mb-4">
                  <span className="flex items-center gap-1"><Clock size={11} />{selected.reading_min} دقائق للقراءة</span>
                  <span className="flex items-center gap-1"><Eye size={11} />{selected.views} مشاهدة</span>
                  <span>{new Date(selected.created_at).toLocaleDateString("ar-SA")}</span>
                </div>
                {selected.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selected.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 text-xs bg-[#e21227]/10 border border-[#e21227]/20 text-[#e21227] rounded-full">{t}</span>
                    ))}
                  </div>
                )}
                <div
                  className="text-[#ccc] text-sm leading-7 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: (selected.content ?? "").replace(/\n/g, "<br>") }}
                />
              </div>
            ) : (
              /* Posts list */
              <div className="divide-y divide-[#111]">
                {posts.length === 0 ? (
                  <div className="p-12 text-center text-[#444] text-sm">لا توجد مقالات منشورة بعد</div>
                ) : (
                  posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => openPost(post.slug)}
                      className="w-full text-left p-5 hover:bg-[#161616] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-sm mb-1 truncate">{post.title}</h3>
                          <p className="text-[#666] text-xs line-clamp-2">{post.excerpt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-[#444]">
                        <span>{post.author_name}</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{post.reading_min} دقيقة</span>
                        <span className="flex items-center gap-1"><Eye size={10} />{post.views}</span>
                        {post.tags?.slice(0, 2).map((t) => (
                          <span key={t} className="flex items-center gap-1 text-[#e21227]/70">
                            <Tag size={9} />{t}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!selected && total > 8 && (
            <div className="flex items-center justify-center gap-3 p-3 border-t border-[#111]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs bg-[#161616] border border-[#1f1f1f] text-white rounded disabled:opacity-30"
              >السابق</button>
              <span className="text-[#555] text-xs">صفحة {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 8 >= total}
                className="px-3 py-1 text-xs bg-[#161616] border border-[#1f1f1f] text-white rounded disabled:opacity-30"
              >التالي</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

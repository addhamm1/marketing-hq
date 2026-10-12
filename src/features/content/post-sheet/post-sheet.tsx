"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/states/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Brand } from "@/features/boards/types";
import { useMessage } from "@/hooks/use-message";
import { Link } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { decidePost, deletePost, submitPost } from "../actions";
import type { ContentPerms } from "../content-view";
import { fetchPost } from "../queries";
import { STATUS_DOT } from "../types";
import { MediaManager } from "./media-manager";
import { PostEditor } from "./post-editor";
import { PostPreview } from "./post-preview";
import { PublishActions } from "./publish-actions";

export function PostSheet({ postId, brands, branches, perms, onClose, onChanged }: {
  postId: string; brands: Brand[]; branches: { id: string; name_en: string; name_ar: string }[]; perms: ContentPerms; onClose: () => void; onChanged: () => void;
}) {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const locale = useLocale();
  const message = useMessage();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();
  const { data: post, isLoading } = useQuery({ queryKey: ["post", postId], queryFn: () => fetchPost(createClient(), postId) });
  const changed = () => {
    queryClient.invalidateQueries({ queryKey: ["post", postId] });
    onChanged();
  };
  const run = (fn: () => Promise<{ ok: boolean; error?: string; params?: Record<string, string | number> }>, success: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) toast.success(success);
      else toast.error(message(r.error, r.params));
      changed();
    });
  const brand = brands.find((b) => b.id === post?.brand_id);
  const editable = !!post && perms.canEdit && post.status !== "published";

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={locale === "ar" ? "left" : "right"} showCloseButton={false}
        className="gap-0 overflow-y-auto p-0 data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:sm:max-w-2xl data-[side=right]:sm:max-w-2xl">
        {isLoading ? (
          <div className="space-y-3 p-6"><SheetTitle className="sr-only">{tc("loading")}</SheetTitle><Skeleton className="h-8 w-1/2" /><Skeleton className="h-96 w-full" /></div>
        ) : !post ? (
          <div className="p-6"><SheetTitle className="sr-only">{tc("notFoundTitle")}</SheetTitle><EmptyState title={tc("notFoundTitle")} /></div>
        ) : (
          <>
            <header className="bg-background sticky top-0 z-10 flex items-start gap-2 border-b px-4 py-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="gap-1.5"><span className={cn("size-2 rounded-full", STATUS_DOT[post.status])} />{t(`status.${post.status}`)}</Badge>
                  <Badge variant="secondary">{t(`format.${post.format as "feed"}`)}</Badge>
                </div>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: brand?.color }} />{brand?.name}
                </SheetTitle>
                <SheetDescription dir="ltr" className="text-start text-xs">{post.scheduled_at ? formatCairo(post.scheduled_at, "EEEE d MMMM yyyy, HH:mm") : "—"}</SheetDescription>
              </div>
              {editable ? <Button variant="ghost" size="icon" onClick={() => setDeleting(true)} aria-label={t("editor.delete")}><Trash2 aria-hidden /></Button> : null}
              <Button variant="ghost" size="icon" onClick={onClose} aria-label={tc("close")}><X aria-hidden /></Button>
            </header>
            <div className="space-y-5 px-4 py-5 sm:px-6">
              {post.card_id ? (
                <Link href={`/cards/${post.card_id}`} className="text-primary-ink flex items-center gap-1.5 text-sm hover:underline"><Link2 className="size-4" aria-hidden />{t("fields.linkedCard")}</Link>
              ) : null}
              {post.review_comment ? <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><span className="font-medium">{t("editor.reviewComment")}: </span>{post.review_comment}</p> : null}

              {post.status === "draft" && perms.canEdit ? (
                <Button size="sm" onClick={() => run(() => submitPost({ id: post.id }), t("editor.submitted"))}>{t("editor.submit")}</Button>
              ) : null}
              {post.status === "in_review" && perms.canApprove ? (
                <div className="space-y-2 rounded-xl border p-3">
                  <Textarea rows={2} placeholder={t("editor.sendBackComment")} aria-label={t("editor.sendBackComment")} value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => run(() => decidePost({ id: post.id, approve: true, comment: comment || undefined }), t("editor.decided"))}>{t("editor.approve")}</Button>
                    <Button size="sm" variant="outline" disabled={!comment.trim()} onClick={() => run(() => decidePost({ id: post.id, approve: false, comment }), t("editor.decided"))}>{t("editor.sendBack")}</Button>
                  </div>
                </div>
              ) : null}

              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">{t("editor.preview")}</TabsTrigger>
                  {editable ? <TabsTrigger value="edit">{t("editor.edit")}</TabsTrigger> : null}
                </TabsList>
                <TabsContent value="preview" className="mt-4 space-y-5">
                  <PostPreview post={post} />
                  <PublishActions post={post} canPublish={perms.canPublish} onDone={changed} />
                </TabsContent>
                {editable ? (
                  <TabsContent value="edit" className="mt-4 space-y-5">
                    <MediaManager post={post} canEdit={editable} onChanged={changed} />
                    <PostEditor key={post.id} post={post} brands={brands} branches={branches} onSaved={changed} />
                  </TabsContent>
                ) : null}
              </Tabs>
            </div>
            <ConfirmDialog open={deleting} onOpenChange={setDeleting} title={t("editor.delete")} body={t("editor.deleteConfirm")} destructive
              onConfirm={() => startTransition(async () => {
                const r = await deletePost({ id: post.id });
                if (r.ok) { toast.success(t("editor.deleted")); onChanged(); onClose(); } else toast.error(message(r.error));
              })} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

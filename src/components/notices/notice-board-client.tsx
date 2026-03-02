"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createNotice, updateNotice } from "@/server/actions/notices";
import { useGovtPrimaryT, useT } from "@/lib/i18n/client";

type ClassRow = {
  id: string;
  name: string;
  grade: string;
  section: string;
};

type NoticeRow = {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  class: {
    id: string;
    name: string;
    grade: string;
    section: string;
  } | null;
};

interface Props {
  classes: ClassRow[];
  notices: NoticeRow[];
  selectedClassId: string;
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export function NoticeBoardClient({
  classes,
  notices,
  selectedClassId,
}: Props) {
  const { t } = useT();
  const { t: tg } = useGovtPrimaryT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishDate, setPublishDate] = useState(todayDateInput());
  const [targetClassId, setTargetClassId] = useState<string>("all");
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editPublishDate, setEditPublishDate] = useState(todayDateInput());
  const [editTargetClassId, setEditTargetClassId] = useState<string>("all");

  const updateClassFilter = (classId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (classId === "all") {
      params.delete("classId");
    } else {
      params.set("classId", classId);
    }
    router.push(`?${params.toString()}`);
  };

  const handleCreate = () => {
    const errors: string[] = [];

    if (!title.trim()) errors.push(t("notice_title_required"));
    if (!body.trim()) errors.push(t("notice_body_required"));
    if (!publishDate) errors.push("Publish date required");

    if (errors.length > 0) {
      toast.error(errors.join(". "));
      return;
    }

    startTransition(async () => {
      const result = await createNotice({
        title: title.trim(),
        body: body.trim(),
        publishDate,
        classId: targetClassId === "all" ? "" : targetClassId,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to publish notice");
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            toast.error(`${field}: ${messages.join(", ")}`);
          });
        }
        return;
      }

      toast.success(t("notice_publish_success"));
      setTitle("");
      setBody("");
      setPublishDate(todayDateInput());
      setTargetClassId("all");
      router.refresh();
    });
  };

  const handleStartEdit = (notice: NoticeRow) => {
    setEditingNoticeId(notice.id);
    setEditTitle(notice.title);
    setEditBody(notice.body);
    setEditPublishDate(notice.publishedAt?.slice(0, 10) ?? todayDateInput());
    setEditTargetClassId(notice.class?.id ?? "all");
  };

  const handleCancelEdit = () => {
    setEditingNoticeId(null);
    setEditTitle("");
    setEditBody("");
    setEditPublishDate(todayDateInput());
    setEditTargetClassId("all");
  };

  const handleSaveEdit = () => {
    if (!editingNoticeId) return;

    const errors: string[] = [];
    if (!editTitle.trim()) errors.push(t("notice_title_required"));
    if (!editBody.trim()) errors.push(t("notice_body_required"));
    if (!editPublishDate) errors.push("Publish date required");

    if (errors.length > 0) {
      toast.error(errors.join(". "));
      return;
    }

    startTransition(async () => {
      const result = await updateNotice(editingNoticeId, {
        title: editTitle.trim(),
        body: editBody.trim(),
        publishDate: editPublishDate,
        classId: editTargetClassId === "all" ? "" : editTargetClassId,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to update notice");
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            toast.error(`${field}: ${messages.join(", ")}`);
          });
        }
        return;
      }

      toast.success(t("notice_update_success"));
      handleCancelEdit();
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tg("notice_board")}
        description={t("notice_board_description")}
      />

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("publish_notice")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("notice_title")}</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("notice_title_placeholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("publish_date")}</Label>
            <Input
              type="date"
              value={publishDate}
              onChange={(event) => setPublishDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("notice_for_class")}</Label>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_classes")}</SelectItem>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {t("class")} {classItem.grade}-{classItem.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-4">
            <Label>{t("notice_body")}</Label>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("notice_body_placeholder")}
              className="min-h-[120px]"
            />
          </div>

          <div className="sm:col-span-4 sm:w-52">
            <Button type="button" onClick={handleCreate} disabled={pending} className="w-full">
              <CalendarPlus className="mr-1.5 h-4 w-4" />
              {pending ? t("saving") : t("publish_notice")}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-sm font-semibold">{t("notices")}</h2>
          <div className="w-full max-w-56 space-y-1.5">
            <Label>{t("filter_by_class")}</Label>
            <Select
              value={selectedClassId || "all"}
              onValueChange={updateClassFilter}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_classes")}</SelectItem>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {t("class")} {classItem.grade}-{classItem.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {notices.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <CalendarPlus className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="font-medium text-foreground mb-1">{t("no_notices_found")}</p>
              <p className="text-sm text-muted-foreground">Create and publish notices to inform students and parents</p>
            </div>
          ) : (
            notices.map((notice) => (
              <article key={notice.id} className="rounded-md border border-border bg-background p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{notice.title}</h3>
                  <div className="text-xs text-muted-foreground">
                    {t("published_on")}: {notice.publishedAt?.slice(0, 10) ?? "-"}
                  </div>
                </div>
                {editingNoticeId === notice.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>{t("notice_title")}</Label>
                        <Input
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("publish_date")}</Label>
                        <Input
                          type="date"
                          value={editPublishDate}
                          onChange={(event) => setEditPublishDate(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-3">
                        <Label>{t("notice_for_class")}</Label>
                        <Select value={editTargetClassId} onValueChange={setEditTargetClassId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("all_classes")}</SelectItem>
                            {classes.map((classItem) => (
                              <SelectItem key={classItem.id} value={classItem.id}>
                                {t("class")} {classItem.grade}-{classItem.section}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("notice_body")}</Label>
                      <Textarea
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        className="min-h-[110px]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={handleSaveEdit} disabled={pending}>
                        {pending ? t("saving") : t("update_notice")}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={handleCancelEdit} disabled={pending}>
                        {t("cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">{notice.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {notice.class
                        ? `${t("class")} ${notice.class.grade}-${notice.class.section}`
                        : t("all_classes")}
                    </p>
                    <div className="mt-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleStartEdit(notice)}>
                        {t("edit_notice")}
                      </Button>
                    </div>
                  </>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

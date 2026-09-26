import { z } from "zod";

export const FacilitySearchQuery = z.object({
  name: z.string().max(100).optional().describe("施設名の部分一致"),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).optional().describe("公開状態"),
  page: z.number().int().min(1).default(1).describe("ページ番号"),
  limit: z.number().int().min(1).max(100).default(20).describe("表示件数"),
});

export const FacilityCreateRequest = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/).describe("組織内で一意な施設コード"),
  name: z.string().min(1).max(100).describe("施設名"),
});

export const ReservationSearchQuery = z.object({
  facilityId: z.string().uuid().optional().describe("施設ID"),
  status: z.enum(["REQUESTED", "CONFIRMED", "CANCELLED"]).optional().describe("予約状態"),
  from: z.string().datetime().optional().describe("開始日時の下限"),
  to: z.string().datetime().optional().describe("開始日時の上限"),
  page: z.number().int().min(1).default(1).describe("ページ番号"),
  limit: z.number().int().min(1).max(100).default(20).describe("表示件数"),
});

export const ReservationStatusRequest = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]).describe("変更後の状態"),
  expectedVersion: z.number().int().min(1).describe("表示時に取得した版番号"),
  reason: z.string().max(240).optional().describe("変更理由"),
});

export const AnnouncementCreateRequest = z.object({
  title: z.string().min(1).max(120).describe("案内のタイトル"),
  body: z.string().min(1).max(4000).describe("案内の本文"),
  publishAt: z.string().datetime().optional().describe("公開予定日時"),
});

export const FacilityImportRequest = z.object({
  fileToken: z.string().min(1).max(120).describe("別工程で安全に受け付けたファイル参照"),
  dryRun: z.boolean().default(true).describe("検証のみ行う"),
});

export const FacilityRecord = z.object({
  id: z.string().uuid().describe("施設ID"),
  code: z.string().min(2).max(20).describe("施設コード"),
  name: z.string().min(1).max(100).describe("施設名"),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).describe("状態"),
  createdAt: z.string().datetime().describe("登録日時"),
});

export const FacilityListResponse = z.object({
  data: z.array(FacilityRecord).describe("施設一覧"),
  pageInfo: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
  }).describe("ページ情報"),
});

export const FacilityDetailResponse = z.object({
  data: FacilityRecord.describe("施設"),
});

export const ReservationRecord = z.object({
  id: z.string().uuid().describe("予約ID"),
  reservationNo: z.string().max(32).describe("予約番号"),
  facilityId: z.string().uuid().describe("施設ID"),
  spaceId: z.string().uuid().describe("区画ID"),
  status: z.enum(["REQUESTED", "CONFIRMED", "CANCELLED"]).describe("予約状態"),
  startsAt: z.string().datetime().describe("開始日時"),
  endsAt: z.string().datetime().describe("終了日時"),
  version: z.number().int().min(1).describe("版番号"),
});

export const ReservationListResponse = z.object({
  data: z.array(ReservationRecord).describe("予約一覧"),
  pageInfo: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
  }).describe("ページ情報"),
});

export const ReservationDetailResponse = z.object({
  data: ReservationRecord.describe("予約"),
});

export const AnnouncementDetailResponse = z.object({
  data: z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.enum(["DRAFT", "SCHEDULED"]),
    publishAt: z.string().datetime().optional(),
  }).describe("お知らせ"),
});

export const ImportJobResponse = z.object({
  data: z.object({
    id: z.string().uuid(),
    status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED"]),
    totalRows: z.number().int().min(0),
    acceptedRows: z.number().int().min(0),
    rejectedRows: z.number().int().min(0),
  }).describe("取込ジョブ"),
});

export const ErrorResponse = z.object({
  code: z.string().describe("エラーコード"),
  message: z.string().describe("説明"),
  fields: z.record(z.array(z.string())).optional().describe("項目別エラー"),
});

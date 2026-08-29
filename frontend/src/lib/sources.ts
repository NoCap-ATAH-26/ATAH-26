import type { ComponentType } from "react";
import {
  HardDrive,
  Hash,
  FileText,
  BookOpen,
  Cloud,
  Globe,
  Database,
  Box,
} from "lucide-react";
import { GithubGlyph } from "@/components/BrandGlyphs";

export interface SourceMeta {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  access: string;
  /** For not-yet-built sources: what I need from the user to build it.
   * Absence means a real Connect flow exists for this source. */
  needs?: string;
}

export const SOURCES: SourceMeta[] = [
  {
    key: "google",
    label: "Google Workspace",
    icon: HardDrive,
    access: "Read-only: Drive files (docs, sheets, PDFs) and Gmail messages/attachments.",
  },
  {
    key: "slack",
    label: "Slack",
    icon: Hash,
    access: "Read-only: messages and files in the channels the app is invited to.",
    needs: "A Slack App (api.slack.com/apps) with a Bot Token and Signing Secret.",
  },
  {
    key: "notion",
    label: "Notion",
    icon: FileText,
    access: "Read-only: pages and databases shared with the integration.",
    needs: "A Notion internal integration token (notion.so/my-integrations).",
  },
  {
    key: "github",
    label: "GitHub",
    icon: GithubGlyph,
    access: "Read-only: repo contents, issues, and releases.",
    needs: "A GitHub App or fine-grained PAT with contents:read + issues:read.",
  },
  {
    key: "confluence",
    label: "Confluence",
    icon: BookOpen,
    access: "Read-only: pages in the connected spaces.",
    needs: "An Atlassian OAuth app (developer.atlassian.com) client ID/secret.",
  },
  {
    key: "sharepoint",
    label: "SharePoint / OneDrive",
    icon: Cloud,
    access: "Read-only: files in the connected drives.",
    needs: "An Azure AD App Registration with Microsoft Graph Files.Read.All.",
  },
  {
    key: "dropbox",
    label: "Dropbox",
    icon: Box,
    access: "Read-only: files in the connected folders.",
    needs: "A Dropbox app key/secret (dropbox.com/developers/apps).",
  },
  {
    key: "crm",
    label: "CRM",
    icon: Database,
    access: "Read-only: contact and deal records.",
    needs: "A HubSpot private app token or Salesforce Connected App credentials.",
  },
  {
    key: "s3",
    label: "S3",
    icon: Database,
    access: "Read-only: objects in the connected bucket.",
    needs: "An IAM user/role with s3:GetObject + s3:ListBucket on the bucket.",
  },
  {
    key: "website",
    label: "Website",
    icon: Globe,
    access: "Public pages only, checked on a schedule for changes.",
    needs: "The URL(s) to watch.",
  },
];

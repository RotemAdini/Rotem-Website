import { useCallback, useEffect, useRef, useState } from "react";
import { useClient, type DocumentActionComponent, type DocumentActionProps } from "sanity";

interface RetiredSlug {
  _key?: string;
  _type?: "retiredSlug";
  slug?: string;
  retiredAt?: string;
}

interface SluggedDocument {
  title?: string;
  alternateTitles?: string[];
  slug?: { current?: string };
  slugHistory?: RetiredSlug[];
}

const API_VERSION = "2026-09-07";

/**
 * Replaces the built-in Publish action for content types that have a slug.
 *
 * When an editor deliberately changes the slug of an already-published
 * document, the previously published slug is appended to `slugHistory` in the
 * same publish. That is what makes the URL safely editable: the old link stays
 * resolvable through slugHistory and permanently redirects to the new one, so
 * nobody's bookmark or shared link breaks — and, separately, nobody's saved
 * favourite is affected either, because favourites reference the immutable
 * contentId rather than the slug.
 *
 * Only an intentional slug change triggers this. Editing a title does not
 * touch the slug (the Studio's slug field never re-derives on its own), so
 * title changes are recorded separately in alternateTitles.
 */
export function createPublishWithSlugHistory(originalPublish: DocumentActionComponent): DocumentActionComponent {
  const PublishWithSlugHistory: DocumentActionComponent = (props: DocumentActionProps) => {
    const { id, type, draft, published } = props;
    const client = useClient({ apiVersion: API_VERSION });
    const [busy, setBusy] = useState(false);
    const original = originalPublish(props);
    const [pendingHistory, setPendingHistory] = useState<{ slug?: string; title?: string } | null>(null);
    const publishRequested = useRef(false);

    const draftDocument = draft as SluggedDocument | null;
    const publishedDocument = published as SluggedDocument | null;

    const previousSlug = publishedDocument?.slug?.current;
    const nextSlug = draftDocument?.slug?.current;
    const slugChanged = Boolean(previousSlug && nextSlug && previousSlug !== nextSlug);
    const previousTitle = publishedDocument?.title;
    const titleChanged = type !== "game" && Boolean(previousTitle && draftDocument?.title && previousTitle !== draftDocument.title);

    useEffect(() => {
      if (!pendingHistory || !publishRequested.current) return;
      // Wait for the external patch to reach Studio's current document before
      // handing off to the current built-in action. It waits for sync and
      // validation of that revision, including asynchronous slug validation.
      if (pendingHistory.slug && !draftDocument?.slugHistory?.some((entry) => entry.slug === pendingHistory.slug)) return;
      if (pendingHistory.title && !draftDocument?.alternateTitles?.includes(pendingHistory.title)) return;
      publishRequested.current = false;
      // Synchronize completion of the external history write with the UI.
      setPendingHistory(null);
      setBusy(false);
      if (original && !original.disabled) original.onHandle?.();
    }, [pendingHistory, draftDocument, original]);

    const handle = useCallback(async () => {
      if (!slugChanged && !titleChanged) {
        original?.onHandle?.();
        return;
      }

      setBusy(true);
      try {
        let patch = client.patch(`drafts.${id}`);
        let needsPatch = false;
        const alreadyRecorded = (draftDocument?.slugHistory || []).some((entry) => entry.slug === previousSlug);
        if (slugChanged && previousSlug && !alreadyRecorded) {
          // Written to the draft first, so the retired slug lands in the same
          // published revision as the new one — never a window where the old
          // URL resolves to nothing.
          patch = patch
            .setIfMissing({ slugHistory: [] })
            .append("slugHistory", [
              {
                _key: `retired-${Date.now().toString(36)}`,
                _type: "retiredSlug",
                slug: previousSlug,
                retiredAt: new Date().toISOString(),
              },
            ]);
          needsPatch = true;
        }
        if (titleChanged && previousTitle && !(draftDocument?.alternateTitles || []).includes(previousTitle)) {
          patch = patch.setIfMissing({ alternateTitles: [] }).append("alternateTitles", [previousTitle]);
          needsPatch = true;
        }
        if (needsPatch) await patch.commit({ visibility: "sync" });
        publishRequested.current = true;
        setPendingHistory({ slug: slugChanged ? previousSlug : undefined, title: titleChanged ? previousTitle : undefined });
      } catch (error) {
        setBusy(false);
        throw error;
      }
    }, [client, draftDocument, id, previousSlug, previousTitle, original, slugChanged, titleChanged]);

    if (!original) return original;

    return {
      ...original,
      disabled: busy || original.disabled,
      label: busy ? "Saving title and URL history…" : original.label,
      title: slugChanged
        ? `Publishing will keep "${previousSlug}" working as a redirect to "${nextSlug}".`
        : original.title,
      onHandle: handle,
    };
  };

  PublishWithSlugHistory.action = originalPublish.action;
  return PublishWithSlugHistory;
}

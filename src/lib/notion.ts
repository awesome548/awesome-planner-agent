import { Client } from "@notionhq/client";
import { env } from "@/lib/env";

const notion = new Client({ auth: env.NOTION_API_KEY });

type NotionRichText = { plain_text: string };

/**
 * Convert a Notion block to readable plain text.
 * We keep it simple: headings/paragraphs/bullets -> lines of text.
 */
function blockToText(block: any): string[] {
  const t = (arr?: NotionRichText[]) => (arr ?? []).map(x => x.plain_text).join("");

  switch (block.type) {
    case "heading_1": return [`# ${t(block.heading_1?.rich_text)}`].filter(Boolean);
    case "heading_2": return [`## ${t(block.heading_2?.rich_text)}`].filter(Boolean);
    case "heading_3": return [`### ${t(block.heading_3?.rich_text)}`].filter(Boolean);

    case "paragraph": {
      const text = t(block.paragraph?.rich_text);
      return text ? [text] : [];
    }

    case "bulleted_list_item": {
      const text = t(block.bulleted_list_item?.rich_text);
      return text ? [`- ${text}`] : [];
    }

    case "numbered_list_item": {
      const text = t(block.numbered_list_item?.rich_text);
      return text ? [`1) ${text}`] : [];
    }

    case "to_do": {
      const text = t(block.to_do?.rich_text);
      return text ? [`- [ ] ${text}`] : [];
    }

    default:
      return [];
  }
}

/**
 * Recursively fetch all blocks under a page (or any block).
 * Notion returns children paginated; also nested blocks require recursion.  [oai_citation:1‡Notion Developers](https://developers.notion.com/reference/get-block-children?utm_source=chatgpt.com)
 */
async function getAllChildBlocks(blockId: string): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    results.push(...res.results);

    if (!res.has_more || !res.next_cursor) break;
    cursor = res.next_cursor;
  }

  // Recursively pull nested children
  for (const b of results) {
    if (b.has_children) {
      const nested = await getAllChildBlocks(b.id);
      // Attach children so we can serialize them in order later
      (b as any).__children = nested;
    }
  }

  return results;
}

function blocksToPlainText(blocks: any[]): string {
  const lines: string[] = [];

  const walk = (bs: any[], depth = 0) => {
    for (const b of bs) {
      const blockLines = blockToText(b);
      for (const line of blockLines) {
        // Indent nested content a bit
        lines.push(depth > 0 ? `${"  ".repeat(depth)}${line}` : line);
      }
      if ((b as any).__children?.length) {
        walk((b as any).__children, depth + 1);
      }
    }
  };

  walk(blocks);
  return lines.join("\n").trim();
}

export async function fetchPlannerRulesFromNotion(): Promise<string> {
  if (!env.NOTION_API_KEY || !env.NOTION_PAGE_ID) {
    throw new Error("Missing NOTION_API_KEY or NOTION_PAGE_ID in env.");
  }

  // Use pageId as block_id to get its children content.  [oai_citation:2‡Notion Developers](https://developers.notion.com/reference/retrieve-a-block?utm_source=chatgpt.com)
  const blocks = await getAllChildBlocks(env.NOTION_PAGE_ID);
  const text = blocksToPlainText(blocks);

  // Keep it safe: truncate if someone writes a huge page
  return text.slice(0, 12000);
}
/**
 * Remark plugin that converts @file mentions in text nodes into link nodes
 * with a `mention:` URL scheme for clickable rendering in react-markdown.
 * Skips code/inlineCode nodes so mentions inside backticks are left alone.
 */

// Inline MDAST-compatible types to avoid needing @types/mdast as a direct dependency.
interface MdastText { type: 'text'; value: string }
interface MdastLink { type: 'link'; url: string; children: MdastNode[] }
interface MdastParent { type: string; children: MdastNode[] }
type MdastNode = MdastText | MdastLink | MdastParent;

/**
 * Matches `@/absolute/path` or `@relative/path` including escaped spaces (`\ `).
 * A mention must be preceded by whitespace or be at the start of text.
 */
const MENTION_RE = /(?<=\s|^)(@(?:\/(?:\\ |[^\s])+|(?:\\ |[^\s])+))/g;

/** Walk text nodes in an MDAST tree, skipping code nodes. */
function walkTextNodes(
  node: MdastParent,
  visitor: (text: MdastText, index: number, parent: MdastParent) => number | void,
): void {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'text') {
      const skip = visitor(child as MdastText, i, node);
      if (typeof skip === 'number') i += skip;
    } else if (
      'children' in child &&
      child.type !== 'code' &&
      child.type !== 'inlineCode' &&
      child.type !== 'link'
    ) {
      walkTextNodes(child as MdastParent, visitor);
    }
  }
}

/**
 * Remark plugin: transforms `@path` text into mdast link nodes with `mention:` scheme.
 * @param cwd - Thread working directory for resolving relative mention paths
 */
export function remarkMentions(cwd: string | null) {
  return () => (tree: MdastParent) => {
    walkTextNodes(tree, (textNode, index, parent) => {
      const matches = [...textNode.value.matchAll(MENTION_RE)];
      if (matches.length === 0) return;

      const newNodes: MdastNode[] = [];
      let lastIndex = 0;

      for (const match of matches) {
        const mentionText = match[1]; // e.g. @src/app.ts or @/absolute/path
        const matchStart = match.index!;

        // Preserve text before this match
        if (matchStart > lastIndex) {
          newNodes.push({ type: 'text', value: textNode.value.slice(lastIndex, matchStart) });
        }

        // Resolve the mention path: strip @, unescape `\ `, make absolute
        const rawPath = mentionText.slice(1).replace(/\\ /g, ' ');
        const absolutePath = rawPath.startsWith('/')
          ? rawPath
          : cwd
            ? `${cwd}/${rawPath}`
            : rawPath;

        newNodes.push({
          type: 'link',
          url: `mention:${absolutePath}`,
          children: [{ type: 'text', value: mentionText }],
        });

        lastIndex = matchStart + mentionText.length;
      }

      // Remaining text after last match
      if (lastIndex < textNode.value.length) {
        newNodes.push({ type: 'text', value: textNode.value.slice(lastIndex) });
      }

      // Splice new nodes into parent, replacing the original text node
      parent.children.splice(index, 1, ...newNodes);
      // Return how many extra nodes were inserted (so walker skips them)
      return newNodes.length - 1;
    });
  };
}

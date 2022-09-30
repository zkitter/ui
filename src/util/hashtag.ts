import { extractHashtagsWithIndices } from '@draft-js-plugins/hashtag';

function parseTokens(state: any) {
  let i,
    j,
    l,
    tokens,
    token,
    text,
    nodes,
    ln,
    level,
    blockTokens = state.tokens;

  for (j = 0, l = blockTokens.length; j < l; j++) {
    if (blockTokens[j].type !== 'inline') {
      continue;
    }
    tokens = blockTokens[j].children;

    // We scan from the end, to keep position when new tags added.
    // Use reversed logic in links start/end match
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];

      if (token.type === 'text') {
        const extracted = extractHashtagsWithIndices(token.content);

        text = token.content;

        if (!extracted.length) {
          continue;
        }

        // Now split string to nodes
        nodes = [];
        level = token.level;
        let lastIndex = 0;

        for (ln = 0; ln < extracted.length; ln++) {
          const { indices } = extracted[ln];
          const [start, end] = indices;

          if (start > lastIndex) {
            nodes.push({
              type: 'text',
              content: text.slice(0, start),
              level: level,
            });
          }
          nodes.push({
            type: 'hashtag_open',
            text: text.slice(start, end),
            level: level,
          });
          lastIndex = end;
        }

        if (lastIndex < text.length) {
          nodes.push({
            type: 'text',
            content: text.slice(lastIndex, text.length),
            level: level,
          });
        }

        // @ts-ignore
        console.log([].concat(tokens.slice(0, i), nodes, tokens.slice(i + 1)));

        // replace current node
        // @ts-ignore
        blockTokens[j].children = tokens = [].concat(
          tokens.slice(0, i),
          nodes,
          tokens.slice(i + 1)
        );
      }
    }
  }
}

export function hashtagify(md: any) {
  md.core.ruler.push('hashtagify', parseTokens);
}

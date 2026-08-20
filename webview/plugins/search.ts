import { Plugin, PluginKey, Transaction, EditorState } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';

export const searchPluginKey = new PluginKey('searchPlugin');

export interface SearchMatch {
    from: number;
    to: number;
}

export interface SearchState {
    searchTerm: string;
    matches: SearchMatch[];
    activeIndex: number;
    matchCase: boolean;
}

const defaultState: SearchState = {
    searchTerm: '',
    matches: [],
    activeIndex: -1,
    matchCase: false
};

function getMatches(doc: any, searchTerm: string, matchCase: boolean): SearchMatch[] {
    if (!searchTerm) return [];
    
    const matches: SearchMatch[] = [];
    const searchString = matchCase ? searchTerm : searchTerm.toLowerCase();
    const searchLen = searchString.length;

    doc.descendants((node: any, pos: number) => {
        if (node.isText && node.text) {
            const nodeText = matchCase ? node.text : node.text.toLowerCase();
            let startIndex = 0;
            
            while (startIndex < nodeText.length) {
                const index = nodeText.indexOf(searchString, startIndex);
                if (index === -1) break;
                
                matches.push({
                    from: pos + index,
                    to: pos + index + searchLen
                });
                startIndex = index + searchLen;
            }
        }
    });
    
    return matches;
}

export const searchPlugin = new Plugin({
    key: searchPluginKey,
    state: {
        init(): SearchState {
            return defaultState;
        },
        apply(tr: Transaction, oldState: SearchState, oldEditorState: EditorState, newEditorState: EditorState): SearchState {
            const searchMeta = tr.getMeta(searchPluginKey);
            
            if (searchMeta) {
                const newState = { ...oldState, ...searchMeta };
                
                // Re-calculate matches if search term or case changed, or if document changed
                if (searchMeta.searchTerm !== undefined || searchMeta.matchCase !== undefined || tr.docChanged) {
                    newState.matches = getMatches(newEditorState.doc, newState.searchTerm, newState.matchCase);
                    
                    // Validate active index
                    if (newState.matches.length === 0) {
                        newState.activeIndex = -1;
                    } else if (newState.activeIndex >= newState.matches.length) {
                        newState.activeIndex = 0;
                    } else if (newState.activeIndex < 0 && newState.matches.length > 0) {
                        newState.activeIndex = 0;
                    }
                }
                
                return newState;
            }
            
            if (tr.docChanged) {
                const matches = getMatches(newEditorState.doc, oldState.searchTerm, oldState.matchCase);
                let activeIndex = oldState.activeIndex;
                
                if (matches.length === 0) {
                    activeIndex = -1;
                } else if (activeIndex >= matches.length) {
                    activeIndex = matches.length - 1;
                }
                
                return {
                    ...oldState,
                    matches,
                    activeIndex
                };
            }
            
            return oldState;
        }
    },
    props: {
        decorations(state: EditorState) {
            const searchState = searchPluginKey.getState(state);
            if (!searchState || searchState.matches.length === 0) return DecorationSet.empty;
            
            const decos: Decoration[] = [];
            
            searchState.matches.forEach((match: SearchMatch, index: number) => {
                const isActive = index === searchState.activeIndex;
                const className = isActive ? 'search-match search-match-active' : 'search-match';
                
                decos.push(Decoration.inline(match.from, match.to, { class: className }));
            });
            
            return DecorationSet.create(state.doc, decos);
        }
    }
});

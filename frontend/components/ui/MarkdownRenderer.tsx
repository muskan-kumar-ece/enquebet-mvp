"use client";

import React, { useMemo } from 'react';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    const renderedNodes = useMemo(() => {
        if (!content) return null;

        const lines = content.split('\n');
        const nodes: React.ReactNode[] = [];
        let inCodeBlock = false;
        let codeBlockLines: string[] = [];
        let codeBlockLang = '';

        lines.forEach((line, index) => {
            // Code block handling
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // Close code block
                    nodes.push(
                        <div key={`code-${index}`} className="my-3 rounded-xl bg-[#08090f] border border-[#1e2335] p-3.5 overflow-x-auto font-mono text-xs text-emerald-300">
                            {codeBlockLang && (
                                <div className="text-[10px] uppercase text-zinc-500 pb-2 mb-2 border-b border-[#1b2030] tracking-wider">
                                    {codeBlockLang}
                                </div>
                            )}
                            <pre className="m-0 leading-relaxed whitespace-pre font-mono">
                                {codeBlockLines.join('\n')}
                            </pre>
                        </div>
                    );
                    inCodeBlock = false;
                    codeBlockLines = [];
                    codeBlockLang = '';
                } else {
                    inCodeBlock = true;
                    codeBlockLang = line.trim().replace(/^```/, '').trim();
                    codeBlockLines = [];
                }
                return;
            }

            if (inCodeBlock) {
                codeBlockLines.push(line);
                return;
            }

            // Empty line
            if (!line.trim()) {
                nodes.push(<div key={`empty-${index}`} className="h-2" />);
                return;
            }

            // Headings
            if (line.startsWith('### ')) {
                nodes.push(
                    <h3 key={`h3-${index}`} className="text-sm font-bold text-white mt-4 mb-2 font-mono flex items-center gap-2">
                        <span className="text-[#1864ff]">###</span>
                        <span>{line.replace('### ', '')}</span>
                    </h3>
                );
                return;
            }
            if (line.startsWith('## ')) {
                nodes.push(
                    <h2 key={`h2-${index}`} className="text-base font-bold text-white mt-5 mb-2.5 font-mono border-b border-[#1e2335] pb-1.5 flex items-center gap-2">
                        <span className="text-[#1864ff]">##</span>
                        <span>{line.replace('## ', '')}</span>
                    </h2>
                );
                return;
            }
            if (line.startsWith('# ')) {
                nodes.push(
                    <h1 key={`h1-${index}`} className="text-lg font-extrabold text-white mt-6 mb-3 font-mono">
                        {line.replace('# ', '')}
                    </h1>
                );
                return;
            }

            // Blockquote
            if (line.startsWith('> ')) {
                nodes.push(
                    <blockquote key={`quote-${index}`} className="border-l-2 border-[#1864ff] bg-[#090b11] px-3.5 py-2 my-2 text-xs text-zinc-300 italic rounded-r-lg">
                        {line.replace('> ', '')}
                    </blockquote>
                );
                return;
            }

            // Bullet list
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const bulletText = line.trim().replace(/^[-*]\s+/, '');
                nodes.push(
                    <div key={`bullet-${index}`} className="flex items-start gap-2 text-xs text-zinc-300 my-1 ml-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1864ff] mt-1.5 shrink-0" />
                        <span>{parseInlineFormatting(bulletText)}</span>
                    </div>
                );
                return;
            }

            // Numbered list
            if (/^\d+\.\s+/.test(line.trim())) {
                const match = line.trim().match(/^(\d+)\.\s+(.*)/);
                if (match) {
                    nodes.push(
                        <div key={`num-${index}`} className="flex items-start gap-2 text-xs text-zinc-300 my-1 ml-2">
                            <span className="text-[#60a5fa] font-mono text-[11px] font-bold shrink-0">{match[1]}.</span>
                            <span>{parseInlineFormatting(match[2])}</span>
                        </div>
                    );
                    return;
                }
            }

            // Paragraph
            nodes.push(
                <p key={`p-${index}`} className="text-xs sm:text-sm text-zinc-300 leading-relaxed my-1.5">
                    {parseInlineFormatting(line)}
                </p>
            );
        });

        return nodes;
    }, [content]);

    return <div className={`space-y-1 ${className}`}>{renderedNodes}</div>;
}

function parseInlineFormatting(text: string): React.ReactNode {
    // Basic inline code parsing `code`
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

    return parts.map((part, i) => {
        if (!part) return null;

        // Inline Code `code`
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            return (
                <code key={i} className="px-1.5 py-0.5 rounded bg-[#141824] border border-[#1e2335] text-[11px] font-mono text-emerald-300">
                    {part.slice(1, -1)}
                </code>
            );
        }

        // Bold **text**
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
                <strong key={i} className="font-bold text-white">
                    {part.slice(2, -2)}
                </strong>
            );
        }

        // Link [text](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
            return (
                <a
                    key={i}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#60a5fa] hover:underline font-medium inline-flex items-center gap-0.5"
                >
                    {linkMatch[1]}
                </a>
            );
        }

        return part;
    });
}

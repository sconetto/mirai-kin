import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

export const PROSE_CLASS =
  "space-y-3 text-sm leading-relaxed text-ink-2 " +
  "[&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink " +
  "[&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-ink " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_a]:text-accent [&_a]:underline [&_strong]:font-semibold " +
  "[&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:border-line [&_th]:py-1 [&_th]:text-left [&_td]:border-b [&_td]:border-line/70 [&_td]:py-1";

export function Mdx({ source }: { source: string }) {
  return (
    <div className={PROSE_CLASS}>
      <MDXRemote source={source} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
    </div>
  );
}

declare module "react-markdown" {
  import * as React from "react";
  export interface ReactMarkdownProps {
    children?: React.ReactNode;
  }
  const ReactMarkdown: React.FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}

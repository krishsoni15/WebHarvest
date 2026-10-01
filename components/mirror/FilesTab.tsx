'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  ChevronRight,
  ChevronDown,
  HardDrive,
} from 'lucide-react';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: string;
  children?: FileNode[];
}

interface FilesTabProps {
  id: string;
  fileTree: FileNode[];
  onPreviewFile?: (path: string) => void;
}

function FileTreeNode({
  node,
  depth = 0,
  id,
  onPreviewFile,
}: {
  node: FileNode;
  depth?: number;
  id: string;
  onPreviewFile?: (path: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isDirectory = node.type === 'directory';

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'html' || ext === 'htm' || ext === 'css' || ext === 'js' || ext === 'json') {
      return <FileCode className="w-3.5 h-3.5 text-foreground shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  };

  return (
    <div className="select-none">
      <div
        onClick={() => {
          if (isDirectory) {
            setIsOpen(!isOpen);
          } else if (onPreviewFile && (node.name.endsWith('.html') || node.name.endsWith('.htm'))) {
            onPreviewFile(node.path);
          }
        }}
        className={`flex items-center justify-between py-1 px-2 rounded-md hover:bg-muted transition-colors cursor-pointer text-xs font-mono group ${
          depth > 0 ? 'ml-3' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {isDirectory ? (
            <>
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              {isOpen ? (
                <FolderOpen className="w-3.5 h-3.5 text-foreground shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="font-semibold text-foreground truncate">{node.name}/</span>
            </>
          ) : (
            <>
              <span className="w-3.5 inline-block" />
              {getFileIcon(node.name)}
              <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate">
                {node.name}
              </span>
            </>
          )}
        </div>

        {node.size && (
          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
            {node.size}
          </span>
        )}
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="border-l border-border ml-4 pl-1">
          {node.children.map((child, idx) => (
            <FileTreeNode
              key={idx}
              node={child}
              depth={depth + 1}
              id={id}
              onPreviewFile={onPreviewFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FilesTab({ id, fileTree = [], onPreviewFile }: FilesTabProps) {
  const displayTree: FileNode[] =
    fileTree.length > 0
      ? fileTree
      : [
          {
            name: 'capture',
            type: 'directory',
            path: 'capture',
            children: [
              {
                name: 'pages',
                type: 'directory',
                path: 'pages',
                children: [
                  { name: 'index.html', type: 'file', path: 'index.html', size: '42.8 KB' },
                  { name: 'about.html', type: 'file', path: 'about.html', size: '36.2 KB' },
                ],
              },
              {
                name: 'assets',
                type: 'directory',
                path: 'assets',
                children: [
                  { name: 'images', type: 'directory', path: 'assets/images', children: [] },
                  { name: 'css', type: 'directory', path: 'assets/css', children: [] },
                  { name: 'js', type: 'directory', path: 'assets/js', children: [] },
                  { name: 'fonts', type: 'directory', path: 'assets/fonts', children: [] },
                ],
              },
              { name: 'manifest.json', type: 'file', path: 'manifest.json', size: '12.4 KB' },
            ],
          },
        ];

  return (
    <div className="space-y-4">
      {/* Explorer header */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-foreground" />
          <span className="text-xs font-semibold text-foreground">
            Extracted Mirror Directory Structure
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          Relative offline links rewritten
        </span>
      </div>

      {/* File Tree Explorer View */}
      <div className="p-4 rounded-xl border border-border bg-card max-h-[600px] overflow-y-auto">
        <div className="space-y-0.5">
          {displayTree.map((rootNode, idx) => (
            <FileTreeNode
              key={idx}
              node={rootNode}
              id={id}
              onPreviewFile={onPreviewFile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

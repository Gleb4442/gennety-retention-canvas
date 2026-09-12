import React, { useCallback, useRef, useState } from 'react';
import { ViewportPortal, useReactFlow } from '@xyflow/react';
import { useBoardStore } from '../store/useBoardStore';
import type { DrawingPoint, DrawingStroke } from '../types';

function distToSegment(p: DrawingPoint, v: DrawingPoint, w: DrawingPoint): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function isPointNearStroke(p: DrawingPoint, stroke: DrawingStroke, threshold = 16): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;
  if (stroke.points.length === 1) {
    return Math.hypot(stroke.points[0].x - p.x, stroke.points[0].y - p.y) <= threshold + stroke.width / 2;
  }
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const a = stroke.points[i];
    const b = stroke.points[i + 1];
    if (distToSegment(p, a, b) <= threshold + stroke.width / 2) {
      return true;
    }
  }
  return false;
}

function renderStrokePath(stroke: DrawingStroke): string {
  const pts = stroke.points;
  if (!pts || pts.length === 0) return '';
  
  if (stroke.tool === 'arrow') {
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 0.1} ${pts[0].y + 0.1}`;
    const start = pts[0];
    const end = pts[pts.length - 1];
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  if (pts.length === 1) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 0.5} ${pts[0].y + 0.5}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export const DrawingLayer: React.FC = () => {
  const { screenToFlowPosition } = useReactFlow();

  const drawings = useBoardStore((s) => s.drawings);
  const isDrawingMode = useBoardStore((s) => s.isDrawingMode);
  const drawingTool = useBoardStore((s) => s.drawingTool);
  const drawingColor = useBoardStore((s) => s.drawingColor);
  const drawingWidth = useBoardStore((s) => s.drawingWidth);

  const addDrawingStroke = useBoardStore((s) => s.addDrawingStroke);
  const deleteDrawingStroke = useBoardStore((s) => s.deleteDrawingStroke);

  const [activeStroke, setActiveStroke] = useState<DrawingStroke | null>(null);
  const isErasingRef = useRef(false);

  const isInteractive = isDrawingMode && drawingTool !== 'select';

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isInteractive || e.button !== 0) return;

      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (drawingTool === 'eraser') {
        isErasingRef.current = true;
        // Check collision and delete
        for (const stroke of drawings) {
          if (isPointNearStroke(flowPos, stroke)) {
            deleteDrawingStroke(stroke.id);
            break;
          }
        }
      } else {
        // Start pen / highlighter / arrow stroke
        const newStroke: DrawingStroke = {
          id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          points: [flowPos],
          color: drawingColor,
          width: drawingWidth,
          tool: drawingTool as 'pen' | 'highlighter' | 'arrow',
          opacity: drawingTool === 'highlighter' ? 0.4 : 1,
        };
        setActiveStroke(newStroke);
      }
    },
    [isInteractive, drawingTool, drawings, screenToFlowPosition, drawingColor, drawingWidth, deleteDrawingStroke]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isInteractive) return;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (drawingTool === 'eraser' && isErasingRef.current) {
        for (const stroke of drawings) {
          if (isPointNearStroke(flowPos, stroke)) {
            deleteDrawingStroke(stroke.id);
          }
        }
      } else if (activeStroke) {
        if (activeStroke.tool === 'arrow') {
          // Arrow only updates endpoint
          setActiveStroke((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              points: [prev.points[0], flowPos],
            };
          });
        } else {
          // Pen / Highlighter: append points if moved at least 2px
          setActiveStroke((prev) => {
            if (!prev) return null;
            const last = prev.points[prev.points.length - 1];
            if (last && Math.hypot(last.x - flowPos.x, last.y - flowPos.y) < 2) {
              return prev;
            }
            return {
              ...prev,
              points: [...prev.points, flowPos],
            };
          });
        }
      }
    },
    [isInteractive, drawingTool, drawings, activeStroke, screenToFlowPosition, deleteDrawingStroke]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      isErasingRef.current = false;

      if (activeStroke && activeStroke.points.length > 0) {
        addDrawingStroke(activeStroke);
        setActiveStroke(null);
      }
    },
    [activeStroke, addDrawingStroke]
  );

  return (
    <ViewportPortal>
      <svg
        className="drawing-svg-layer select-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: isInteractive ? 'all' : 'none',
          cursor: isInteractive
            ? drawingTool === 'eraser'
              ? 'cell'
              : 'crosshair'
            : 'default',
          zIndex: 15,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <marker
            id="drawing-arrowhead"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="currentColor" />
          </marker>
        </defs>

        {/* Existing Completed Strokes */}
        {drawings.map((stroke) => {
          const isHighlight = stroke.tool === 'highlighter';
          const isArrow = stroke.tool === 'arrow';
          const strokeWidth = isHighlight ? stroke.width * 3.5 : stroke.width;

          return (
            <path
              key={stroke.id}
              d={renderStrokePath(stroke)}
              stroke={stroke.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={isHighlight ? 0.35 : (stroke.opacity ?? 1)}
              style={{ color: stroke.color }}
              markerEnd={isArrow ? 'url(#drawing-arrowhead)' : undefined}
            />
          );
        })}

        {/* In-Progress Stroke */}
        {activeStroke && (
          <path
            d={renderStrokePath(activeStroke)}
            stroke={activeStroke.color}
            strokeWidth={activeStroke.tool === 'highlighter' ? activeStroke.width * 3.5 : activeStroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={activeStroke.tool === 'highlighter' ? 0.35 : (activeStroke.opacity ?? 1)}
            style={{ color: activeStroke.color }}
            markerEnd={activeStroke.tool === 'arrow' ? 'url(#drawing-arrowhead)' : undefined}
          />
        )}
      </svg>
    </ViewportPortal>
  );
};
